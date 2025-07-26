# Deployment Strategy and Infrastructure

## Overview
This document outlines the comprehensive deployment strategy for the Telegram RPS Tournament Bot, including infrastructure setup, deployment pipelines, rollback procedures, and monitoring requirements.

## Infrastructure Architecture

### Environment Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│ • Local testing │    │ • Integration   │    │ • Live users    │
│ • Unit tests    │ ──▶│ • E2E testing   │ ──▶│ • Full load     │
│ • Quick fixes   │    │ • Performance   │    │ • High availability│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Cloud Infrastructure (AWS)

#### Production Environment
```yaml
# AWS Infrastructure
Production:
  Compute:
    - ECS Fargate Cluster
    - Auto Scaling (2-10 instances)
    - Application Load Balancer
    - CloudFront CDN

  Storage:
    - RDS PostgreSQL (Multi-AZ)
    - ElastiCache Redis (Cluster mode)
    - S3 for static assets
    - EBS snapshots for backups

  Networking:
    - VPC with public/private subnets
    - NAT Gateway for private subnets
    - Security Groups and NACLs
    - Route 53 for DNS management

  Monitoring:
    - CloudWatch for metrics and logs
    - X-Ray for distributed tracing
    - GuardDuty for security monitoring
    - Config for compliance tracking
```

#### Staging Environment
```yaml
Staging:
  Compute:
    - ECS Fargate (1-2 instances)
    - No auto-scaling (cost optimization)
    - Application Load Balancer

  Storage:
    - RDS PostgreSQL (Single-AZ)
    - ElastiCache Redis (Single node)
    - S3 for static assets

  Networking:
    - Simplified VPC setup
    - Basic security groups
    - Route 53 subdomain
```

### Container Strategy

#### Dockerfile Configuration
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -D -H -u 1001 -s /sbin/nologin nodejs

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodejs

# Start application
CMD ["node", "dist/main.js"]
```

#### Docker Compose for Local Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:password@postgres:5432/rps_tournament
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/app/src
      - ./test:/app/test
    command: npm run start:dev

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: rps_tournament
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

## Deployment Pipeline

### CI/CD Workflow Architecture
```mermaid
graph TD
    A[Code Push] --> B[GitHub Actions Trigger]
    B --> C[Build & Test Pipeline]
    C --> D{Tests Pass?}
    D -->|No| E[Notify Team]
    D -->|Yes| F[Build Docker Image]
    F --> G[Push to Registry]
    G --> H{Branch?}
    H -->|develop| I[Deploy to Staging]
    H -->|main| J[Deploy to Production]
    I --> K[Run E2E Tests]
    K --> L{Tests Pass?}
    L -->|No| M[Rollback Staging]
    L -->|Yes| N[Staging Success]
    J --> O[Blue-Green Deployment]
    O --> P[Health Checks]
    P --> Q{Healthy?}
    Q -->|No| R[Automatic Rollback]
    Q -->|Yes| S[Production Success]
```

### GitHub Actions Deployment Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main, develop]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: rps-tournament-bot
  ECS_SERVICE: rps-tournament-service
  ECS_CLUSTER: rps-tournament-cluster

jobs:
  deploy:
    name: Deploy to ${{ github.ref == 'refs/heads/main' && 'Production' || 'Staging' }}
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Set environment variables
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "ENVIRONMENT=production" >> $GITHUB_ENV
            echo "ECS_CLUSTER=rps-tournament-prod" >> $GITHUB_ENV
            echo "ECS_SERVICE=rps-tournament-prod-service" >> $GITHUB_ENV
          else
            echo "ENVIRONMENT=staging" >> $GITHUB_ENV
            echo "ECS_CLUSTER=rps-tournament-staging" >> $GITHUB_ENV
            echo "ECS_SERVICE=rps-tournament-staging-service" >> $GITHUB_ENV
          fi

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:$ENVIRONMENT-latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$ENVIRONMENT-latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Download task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition ${{ env.ECS_SERVICE }} \
            --query taskDefinition > task-definition.json

      - name: Fill in the new image ID in the Amazon ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: rps-tournament-container
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Wait for deployment completion
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE }}

      - name: Run health checks
        run: |
          if [ "$ENVIRONMENT" = "production" ]; then
            URL="https://api.rpstournament.com/health"
          else
            URL="https://staging-api.rpstournament.com/health"
          fi
          
          for i in {1..10}; do
            if curl -f $URL; then
              echo "Health check passed"
              exit 0
            fi
            echo "Health check failed, retrying in 30 seconds..."
            sleep 30
          done
          
          echo "Health check failed after 5 minutes"
          exit 1

      - name: Run smoke tests
        if: success()
        run: |
          npm run test:smoke -- --env=$ENVIRONMENT

      - name: Notify deployment success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          channel: '#deployments'
          text: "🚀 ${{ env.ENVIRONMENT }} deployment successful - ${{ github.sha }}"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Rollback on failure
        if: failure()
        run: |
          echo "Deployment failed, initiating rollback..."
          
          # Get previous stable task definition
          PREVIOUS_TASK_DEF=$(aws ecs list-task-definitions \
            --family-prefix ${{ env.ECS_SERVICE }} \
            --status ACTIVE \
            --sort DESC \
            --query "taskDefinitionArns[1]" \
            --output text)
          
          if [ "$PREVIOUS_TASK_DEF" != "None" ]; then
            aws ecs update-service \
              --cluster ${{ env.ECS_CLUSTER }} \
              --service ${{ env.ECS_SERVICE }} \
              --task-definition $PREVIOUS_TASK_DEF
              
            aws ecs wait services-stable \
              --cluster ${{ env.ECS_CLUSTER }} \
              --services ${{ env.ECS_SERVICE }}
              
            echo "Rollback completed successfully"
          else
            echo "No previous stable version found for rollback"
          fi

      - name: Notify deployment failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#alerts'
          text: "🚨 ${{ env.ENVIRONMENT }} deployment failed - automatic rollback initiated"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Blue-Green Deployment Strategy

#### Implementation with AWS ECS
```bash
#!/bin/bash
# scripts/blue-green-deploy.sh

set -e

CLUSTER_NAME="rps-tournament-cluster"
SERVICE_NAME="rps-tournament-service"
NEW_IMAGE="$1"

echo "🔄 Starting Blue-Green deployment..."

# Get current task definition
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --query "services[0].taskDefinition" \
  --output text)

echo "📋 Current task definition: $CURRENT_TASK_DEF"

# Create new task definition with new image
NEW_TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition $CURRENT_TASK_DEF \
  --query "taskDefinition" | \
  jq --arg IMAGE "$NEW_IMAGE" '.containerDefinitions[0].image = $IMAGE' | \
  jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')

# Register new task definition
NEW_TASK_DEF_ARN=$(echo "$NEW_TASK_DEF" | \
  aws ecs register-task-definition \
  --cli-input-json file:///dev/stdin \
  --query "taskDefinition.taskDefinitionArn" \
  --output text)

echo "📝 New task definition: $NEW_TASK_DEF_ARN"

# Update service with new task definition (Green deployment)
echo "🟢 Deploying Green version..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $NEW_TASK_DEF_ARN

# Wait for deployment to stabilize
echo "⏳ Waiting for Green deployment to stabilize..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME

# Health check on new deployment
echo "🏥 Running health checks on Green deployment..."
if ./scripts/health-check.sh; then
  echo "✅ Green deployment healthy - deployment successful!"
  
  # Optional: Scale down old tasks gradually
  # This happens automatically with ECS rolling deployments
  
else
  echo "❌ Green deployment unhealthy - rolling back to Blue..."
  
  # Rollback to previous task definition
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $CURRENT_TASK_DEF
    
  aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME
  
  echo "🔄 Rollback completed"
  exit 1
fi
```

### Database Migration Strategy

#### Migration Pipeline
```typescript
// src/database/migrations/migration-runner.ts
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

export class MigrationRunner {
  private readonly logger = new Logger(MigrationRunner.name);

  constructor(private readonly dataSource: DataSource) {}

  async runMigrations(): Promise<void> {
    try {
      this.logger.log('🔄 Starting database migrations...');
      
      // Check connection
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      // Get pending migrations
      const pendingMigrations = await this.dataSource.showMigrations();
      
      if (pendingMigrations) {
        this.logger.log(`📋 Found ${pendingMigrations} pending migrations`);
        
        // Run migrations with transaction
        await this.dataSource.runMigrations({
          transaction: 'all', // Run all migrations in a single transaction
        });
        
        this.logger.log('✅ All migrations completed successfully');
      } else {
        this.logger.log('📋 No pending migrations found');
      }
      
    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async revertMigration(): Promise<void> {
    try {
      this.logger.log('🔄 Reverting last migration...');
      
      await this.dataSource.undoLastMigration({
        transaction: 'all',
      });
      
      this.logger.log('✅ Migration reverted successfully');
    } catch (error) {
      this.logger.error('❌ Migration revert failed:', error);
      throw error;
    }
  }
}
```

#### Pre-deployment Migration Script
```bash
#!/bin/bash
# scripts/migrate-database.sh

set -e

ENVIRONMENT=${1:-staging}

echo "🗄️ Running database migrations for $ENVIRONMENT..."

# Load environment variables
if [ "$ENVIRONMENT" = "production" ]; then
  export DATABASE_URL="$PROD_DATABASE_URL" 
  export NODE_ENV=production
else
  export DATABASE_URL="$STAGING_DATABASE_URL"
  export NODE_ENV=staging
fi

# Create database backup before migration
echo "💾 Creating database backup..."
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
./scripts/backup-database.sh $ENVIRONMENT $BACKUP_NAME

# Run migrations
echo "🔧 Running TypeORM migrations..."
npm run db:migrate

# Verify migrations
echo "✅ Verifying database schema..."
npm run db:schema:verify

echo "🎉 Database migration completed successfully!"
```

## Rollback Procedures

### Automatic Rollback Triggers
```yaml
# Rollback conditions
rollback_triggers:
  health_check_failures: 3
  error_rate_threshold: 5%
  response_time_threshold: 2000ms
  memory_usage_threshold: 90%
  cpu_usage_threshold: 80%
```

### Manual Rollback Process
```bash
#!/bin/bash
# scripts/rollback.sh

set -e

ENVIRONMENT=${1:-staging}
VERSION=${2:-previous}

echo "🔄 Initiating rollback for $ENVIRONMENT environment..."

if [ "$ENVIRONMENT" = "production" ]; then
  CLUSTER="rps-tournament-prod"
  SERVICE="rps-tournament-prod-service"
elif [ "$ENVIRONMENT" = "staging" ]; then
  CLUSTER="rps-tournament-staging"
  SERVICE="rps-tournament-staging-service"
else
  echo "❌ Invalid environment: $ENVIRONMENT"
  exit 1
fi

# Get rollback target
if [ "$VERSION" = "previous" ]; then
  echo "📋 Finding previous stable version..."
  TASK_DEF=$(aws ecs list-task-definitions \
    --family-prefix $SERVICE \
    --status ACTIVE \
    --sort DESC \
    --query "taskDefinitionArns[1]" \
    --output text)
else
  TASK_DEF="$VERSION"
fi

if [ "$TASK_DEF" = "None" ] || [ -z "$TASK_DEF" ]; then
  echo "❌ No previous stable version found"
  exit 1
fi

echo "🎯 Rolling back to: $TASK_DEF"

# Perform rollback
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $TASK_DEF

# Wait for rollback to complete
echo "⏳ Waiting for rollback to complete..."
aws ecs wait services-stable \
  --cluster $CLUSTER \
  --services $SERVICE

# Verify rollback
echo "🏥 Verifying rollback health..."
if ./scripts/health-check.sh $ENVIRONMENT; then
  echo "✅ Rollback completed successfully!"
  
  # Notify team
  ./scripts/notify-rollback.sh $ENVIRONMENT $TASK_DEF "success"
else
  echo "❌ Rollback verification failed!"
  ./scripts/notify-rollback.sh $ENVIRONMENT $TASK_DEF "failed"
  exit 1
fi
```

### Database Rollback Strategy
```bash
#!/bin/bash
# scripts/rollback-database.sh

set -e

ENVIRONMENT=${1:-staging}
BACKUP_NAME=${2}

if [ -z "$BACKUP_NAME" ]; then
  echo "❌ Backup name required for database rollback"
  exit 1
fi

echo "🗄️ Rolling back database for $ENVIRONMENT..."

# Stop application to prevent data corruption
echo "⏸️ Scaling down application..."
./scripts/scale-app.sh $ENVIRONMENT 0

# Restore database from backup
echo "🔄 Restoring database from backup: $BACKUP_NAME"
./scripts/restore-database.sh $ENVIRONMENT $BACKUP_NAME

# Verify database integrity
echo "✅ Verifying database integrity..."
npm run db:schema:verify

# Restart application
echo "▶️ Scaling up application..."
./scripts/scale-app.sh $ENVIRONMENT 2

echo "🎉 Database rollback completed successfully!"
```

## Monitoring and Alerting

### Application Health Monitoring
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, RedisHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      // Database connectivity
      () => this.db.pingCheck('database'),
      
      // Redis connectivity  
      () => this.redis.checkHealth('redis'),
      
      // Custom health indicators
      () => this.checkBotConnection(),
      () => this.checkQueueHealth(),
      () => this.checkMemoryUsage(),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  async readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.checkHealth('redis'),
    ]);
  }

  @Get('live')
  async liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  private async checkBotConnection() {
    // Implement Telegram bot connectivity check
    return { bot: { status: 'up' } };
  }

  private async checkQueueHealth() {
    // Implement queue health check
    return { queue: { status: 'up' } };
  }

  private async checkMemoryUsage() {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    
    return {
      memory: {
        status: heapUsedMB < 512 ? 'up' : 'warning',
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
      },
    };
  }
}
```

### CloudWatch Alarms Configuration
```yaml
# cloudformation/alarms.yml
Resources:
  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${AWS::StackName}-high-error-rate"
      AlarmDescription: "High error rate detected"
      MetricName: "4XXError"
      Namespace: "AWS/ApplicationELB"
      Statistic: "Sum"
      Period: 300
      EvaluationPeriods: 2
      Threshold: 10
      ComparisonOperator: "GreaterThanThreshold"
      AlarmActions:
        - !Ref SNSTopicArn
      Dimensions:
        - Name: "LoadBalancer"
          Value: !Ref ApplicationLoadBalancer

  HighResponseTimeAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${AWS::StackName}-high-response-time"
      AlarmDescription: "High response time detected"
      MetricName: "TargetResponseTime"
      Namespace: "AWS/ApplicationELB"
      Statistic: "Average"
      Period: 300
      EvaluationPeriods: 3
      Threshold: 2.0
      ComparisonOperator: "GreaterThanThreshold"
      AlarmActions:
        - !Ref SNSTopicArn

  HighCPUUtilizationAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${AWS::StackName}-high-cpu"
      AlarmDescription: "High CPU utilization"
      MetricName: "CPUUtilization"
      Namespace: "AWS/ECS"
      Statistic: "Average"
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: "GreaterThanThreshold"
      AlarmActions:
        - !Ref SNSTopicArn
```

### Performance Monitoring
```typescript
// src/monitoring/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  private readonly httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  private readonly gameOperationsTotal = new Counter({
    name: 'game_operations_total',
    help: 'Total number of game operations',
    labelNames: ['operation', 'status'],
  });

  private readonly activeGamesGauge = new Histogram({
    name: 'active_games_total',
    help: 'Number of currently active games',
  });

  constructor() {
    // Register metrics
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestTotal);
    register.registerMetric(this.gameOperationsTotal);
    register.registerMetric(this.activeGamesGauge);
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration / 1000);
    
    this.httpRequestTotal
      .labels(method, route, statusCode.toString())
      .inc();
  }

  recordGameOperation(operation: string, status: 'success' | 'error') {
    this.gameOperationsTotal.labels(operation, status).inc();
  }

  updateActiveGamesCount(count: number) {
    this.activeGamesGauge.observe(count);
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
```

## Security Considerations

### Secrets Management
```yaml
# AWS Secrets Manager integration
secrets_configuration:
  database_password:
    source: "AWS::SecretsManager"
    secret_name: "/rps-tournament/database/password"
    
  bot_token:
    source: "AWS::SecretsManager"
    secret_name: "/rps-tournament/telegram/bot-token"
    
  redis_auth:
    source: "AWS::SecretsManager"
    secret_name: "/rps-tournament/redis/auth-token"
```

### Network Security
```yaml
# Security Groups Configuration
security_groups:
  application_sg:
    ingress:
      - protocol: tcp
        port: 443
        source: "0.0.0.0/0"  # ALB only
      - protocol: tcp
        port: 3000
        source: "sg-alb-security-group"
    egress:
      - protocol: tcp
        port: 5432
        destination: "sg-database-security-group"
      - protocol: tcp
        port: 6379
        destination: "sg-redis-security-group"

  database_sg:
    ingress:
      - protocol: tcp
        port: 5432
        source: "sg-application-security-group"
    egress: []

  redis_sg:
    ingress:
      - protocol: tcp
        port: 6379
        source: "sg-application-security-group"
    egress: []
```

This comprehensive deployment strategy ensures reliable, scalable, and secure deployment of the Telegram RPS Tournament Bot with proper monitoring, rollback capabilities, and infrastructure automation.