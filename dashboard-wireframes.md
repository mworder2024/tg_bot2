# Dashboard Wireframes & UI Components

## Main Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🎮 RPS Tournament Bot Dashboard                    [🔔 3] [👤 Admin] [⚙️] [📤] │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌────────────────────────────────────────────────────────────┐ │
│ │   NAVIGATION    │ │                    MAIN CONTENT AREA                      │ │
│ │                 │ │                                                            │ │
│ │ 📊 Overview     │ │  ┌──────────────────┐ ┌──────────────────┐               │ │
│ │ 🏆 Tournaments  │ │  │   Live Stats     │ │  System Health   │               │ │
│ │ 👥 Players      │ │  │                  │ │                  │               │ │
│ │ 📈 Analytics    │ │  │  Active: 1,247   │ │  🟢 All Systems  │               │ │
│ │ 🚨 Alerts       │ │  │  Games: 89/min   │ │     Online       │               │ │
│ │ 📋 Logs         │ │  │  Tournaments: 23 │ │                  │               │ │
│ │ ⚙️ Settings     │ │  └──────────────────┘ └──────────────────┘               │ │
│ │ 👤 Users        │ │                                                            │ │
│ │ 🔧 Admin        │ │  ┌─────────────────────────────────────────────────────┐  │ │
│ │                 │ │  │              Live Tournament Feed                  │  │ │
│ │                 │ │  │                                                     │  │ │
│ │                 │ │  │  T001: Championship (24/32) - Round 3/5 - 02:34   │  │ │
│ │                 │ │  │  T002: Quick Match (8/8) - Finals - 00:45          │  │ │
│ │                 │ │  │  T003: Weekly Cup (45/64) - Round 2/6 - 15:22      │  │ │
│ │                 │ │  └─────────────────────────────────────────────────────┘  │ │
│ └─────────────────┘ └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Tournament Management Interface

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🏆 Tournament Management                                    [Create New] [Import] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌─ Active Tournaments ────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │ │
│ │ │  T001: Daily │ │ T002: Quick  │ │ T003: Weekly │ │  T004: Pro   │        │ │
│ │ │  Championship│ │    Match     │ │    League    │ │  Tournament  │        │ │
│ │ │              │ │              │ │              │ │              │        │ │
│ │ │  👥 24/32    │ │  👥 8/8      │ │  👥 45/64    │ │  👥 16/16    │        │ │
│ │ │  ⏱️ 02:34    │ │  ⏱️ 00:45    │ │  ⏱️ 15:22    │ │  ⏱️ 08:12    │        │ │
│ │ │  🎯 Round 3/5│ │  🎯 Finals   │ │  🎯 Round 2/6│ │  🎯 Round 4/4│        │ │
│ │ │              │ │              │ │              │ │              │        │ │
│ │ │ [Monitor]    │ │ [Monitor]    │ │ [Monitor]    │ │ [Monitor]    │        │ │
│ │ │ [Stop]       │ │ [Stop]       │ │ [Stop]       │ │ [Stop]       │        │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Scheduled Tournaments ─────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ T005  Evening Challenge    📅 Today 18:00      👥 0/64    [Edit] [Cancel]   │ │
│ │ T006  Weekend Special      📅 Saturday 10:00   👥 0/128   [Edit] [Cancel]   │ │
│ │ T007  Monthly Championship 📅 Next Week        👥 0/256   [Edit] [Cancel]   │ │
│ │                                                                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Quick Actions ─────────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ [📊 Export Tournament Data] [📈 Generate Report] [🔄 Bulk Operations]       │ │
│ │ [⚡ Emergency Stop All] [📋 Tournament Templates] [🎯 Schedule Batch]        │ │
│ │                                                                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Live Tournament Monitor

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🏆 Tournament T001: Daily Championship                          [Auto-refresh] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌─ Tournament Status ──────────────────────────────────────────────────────────┐ │
│ │ Status: ⚡ ACTIVE   Players: 24/32   Round: 3/5   Time: 02:34   Next: 01:26 │ │
│ │ Prize Pool: $500   Entry Fee: $5   Total Matches: 156   Completed: 89       │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Live Bracket View ──────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │     ROUND 1      ROUND 2    SEMIFINALS     FINAL      CHAMPION              │ │
│ │                                                                              │ │
│ │ Player1 ──┐                                                                  │ │
│ │           ├─ Player1 ──┐                                                     │ │
│ │ Player2 ──┘ (R vs P)   │                                                     │ │
│ │                        ├─ Player1 ──┐                                       │ │
│ │ Player3 ──┐ (S vs R)   │ (R vs S)   │                                       │ │
│ │           ├─ Player4 ──┘             │                                       │ │
│ │ Player4 ──┘                          ├─ ??? ──┐                             │ │
│ │                                      │        │                             │ │
│ │ Player5 ──┐                          │        │                             │ │
│ │           ├─ Player5 ──┐             │        │                             │ │
│ │ Player6 ──┘ (P vs S)   │             │        ├─ CHAMPION                   │ │
│ │                        ├─ Player8 ──┘        │                             │ │
│ │ Player7 ──┐ (R vs P)   │ (S vs R)            │                             │ │
│ │           ├─ Player8 ──┘                     │                             │ │
│ │ Player8 ──┘                                  │                             │ │
│ │                                              │                             │ │
│ │ [Show All Matches] [Export Bracket] [Print] │                             │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Live Match Feed ────────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ 🔴 LIVE: Player1 vs Player8 (Semifinals) - 00:23 remaining                  │ │
│ │ • Player1 chose: 🪨 ROCK                                                     │ │
│ │ • Player8 choosing... ⏳                                                     │ │
│ │ • Spectators: 47 watching                                                   │ │
│ │                                                                              │ │
│ │ Recent Results:                                                              │ │
│ │ ✅ Player3 vs Player4: 🪨 vs 📄 → Player4 advances                         │ │
│ │ ✅ Player5 vs Player6: 📄 vs ✂️ → Player6 advances                         │ │
│ │ ✅ Player7 vs Player8: ✂️ vs 🪨 → Player8 advances                         │ │
│ │                                                                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Player Management Interface

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 👥 Player Management                          [Search: ________] [Add] [Import] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌─ Filters ────────────────────────────────────────────────────────────────────┐ │
│ │ Status: [All ▼] Registration: [All ▼] Country: [All ▼] Activity: [All ▼]    │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Player List ────────────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ ID     Avatar Username       Status    Rank  W/L     Last Seen    Actions   │ │
│ │ ────── ───── ─────────────── ───────── ───── ────── ──────────── ─────────── │ │
│ │ 12345  [👤]  @rockmaster     🟢 Active  #1   890/234 2 min ago   [👁][⚠️][🚫] │ │
│ │ 12346  [🎮]  @paperpro       🟢 Active  #2   823/187 5 min ago   [👁][⚠️][🚫] │ │
│ │ 12347  [🏆]  @scissorking     🟡 Warning #3   756/203 1 hour ago  [👁][⚠️][✅] │ │
│ │ 12348  [⭐]  @rpslegend       🟢 Active  #4   892/156 30 min ago  [👁][⚠️][🚫] │ │
│ │ 12349  [🎯]  @champion        🔴 Banned  #5   837/247 2 days ago  [👁][✅][📧] │ │
│ │ 12350  [🌟]  @quickdraw       🟢 Active  #12  456/123 1 min ago   [👁][⚠️][🚫] │ │
│ │                                                                              │ │
│ │ ◀ Previous [1] 2 3 4 5 ... 45 Next ▶                      Showing 1-10/450 │ │
│ │                                                                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Bulk Actions ───────────────────────────────────────────────────────────────┐ │
│ │ [☑️ Select All] [📧 Send Message] [⚠️ Bulk Warning] [🚫 Bulk Ban] [📤 Export] │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Player Statistics ──────────────────────────────────────────────────────────┐ │
│ │ Total Players: 12,456 | Active: 8,234 | Banned: 123 | Warning: 45          │ │
│ │ New Today: 89 | Premium: 1,567 | Average Games/Player: 45                   │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Analytics Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 📈 Analytics Dashboard                       [Time Range: Last 30 Days ▼] [📤] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌─ Key Performance Indicators ─────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌───────────────┐ │ │
│ │ │ Daily Active   │ │ Tournament     │ │ Avg Session    │ │ Revenue       │ │ │
│ │ │ Users          │ │ Completion     │ │ Duration       │ │               │ │ │
│ │ │                │ │ Rate           │ │                │ │               │ │ │
│ │ │    3,456       │ │     87%        │ │   24 mins      │ │   $12,450     │ │ │
│ │ │   ↑ +12%       │ │   ↑ +3%        │ │   ↑ +2 mins    │ │   ↑ +8%       │ │ │
│ │ └────────────────┘ └────────────────┘ └────────────────┘ └───────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ User Activity Timeline ─────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ Users                                                                        │ │
│ │ 4000 ┤                              ╭─╮                                      │ │
│ │ 3500 ┤                            ╭─╯ ╰─╮                                    │ │
│ │ 3000 ┤                          ╭─╯     ╰─╮                                  │ │
│ │ 2500 ┤                        ╭─╯         ╰─╮                                │ │
│ │ 2000 ┤                      ╭─╯             ╰─╮                              │ │
│ │ 1500 ┤                    ╭─╯                 ╰─╮                            │ │
│ │ 1000 ┤                  ╭─╯                     ╰─╮                          │ │
│ │  500 ┤                ╭─╯                         ╰─╮                        │ │
│ │    0 └────────────────────────────────────────────────────────────────────  │ │
│ │      00:00   06:00   12:00   18:00   24:00                                  │ │
│ │                                                                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Game Choice Distribution ───────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ ┌─────────────────┐  Rock Usage: 33.2%                                      │ │
│ │ │        🪨       │  • Total plays: 15,467                                  │ │
│ │ │       ROCK      │  • Win rate: 33.1%                                      │ │
│ │ │      33.2%      │  • Most popular at: 19:00-21:00                        │ │
│ │ └─────────────────┘                                                         │ │
│ │                                                                              │ │
│ │ ┌─────────────────┐  Paper Usage: 33.8%                                     │ │
│ │ │        📄       │  • Total plays: 15,734                                  │ │
│ │ │       PAPER     │  • Win rate: 33.9%                                      │ │
│ │ │      33.8%      │  • Most popular at: 14:00-16:00                        │ │
│ │ └─────────────────┘                                                         │ │
│ │                                                                              │ │
│ │ ┌─────────────────┐  Scissors Usage: 33.0%                                  │ │
│ │ │        ✂️       │  • Total plays: 15,356                                  │ │
│ │ │     SCISSORS    │  • Win rate: 33.0%                                      │ │
│ │ │      33.0%      │  • Most popular at: 21:00-23:00                        │ │
│ │ └─────────────────┘                                                         │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## System Health Monitor

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🏥 System Health Monitor                                    [Auto-refresh: 5s] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌─ Overall System Status ──────────────────────────────────────────────────────┐ │
│ │ 🟢 HEALTHY - All systems operational                    Last update: 14:35:22 │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Service Status ─────────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                 │ │
│ │ │ Telegram Bot    │ │ Game Engine     │ │ Database        │                 │ │
│ │ │                 │ │                 │ │                 │                 │ │
│ │ │      🟢         │ │      🟢         │ │      🟡         │                 │ │
│ │ │    ONLINE       │ │    ONLINE       │ │   DEGRADED      │                 │ │
│ │ │   99.9% up      │ │   99.8% up      │ │   95.2% up      │                 │ │
│ │ │   45ms avg      │ │   12ms avg      │ │   89ms avg      │                 │ │
│ │ └─────────────────┘ └─────────────────┘ └─────────────────┘                 │ │
│ │                                                                              │ │
│ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                 │ │
│ │ │ Redis Cache     │ │ Web Dashboard   │ │ File Storage    │                 │ │
│ │ │                 │ │                 │ │                 │                 │ │
│ │ │      🟢         │ │      🟢         │ │      🟢         │                 │ │
│ │ │    ONLINE       │ │    ONLINE       │ │    ONLINE       │                 │ │
│ │ │   100% up       │ │   99.7% up      │ │   99.5% up      │                 │ │
│ │ │   2ms avg       │ │   23ms avg      │ │   67ms avg      │                 │ │
│ │ └─────────────────┘ └─────────────────┘ └─────────────────┘                 │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Resource Usage ─────────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ CPU Usage:     ████████░░ 78%     Memory:    ██████░░░░ 62%                 │ │
│ │ Disk Usage:    ███░░░░░░░ 34%     Network:   ████████░░ 82%                 │ │
│ │                                                                              │ │
│ │ Active Connections:  1,247        Queue Depth:    23                        │ │
│ │ Requests/sec:        156          Error Rate:     0.02%                     │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Active Alerts ──────────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ 🟡 WARNING: Database connection pool at 85% capacity                        │ │
│ │    Started: 14:28:45  Duration: 00:06:37  Status: MONITORING                │ │
│ │    [View Details] [Acknowledge] [Escalate]                                  │ │
│ │                                                                              │ │
│ │ 🟡 WARNING: High network traffic detected                                   │ │
│ │    Started: 14:30:12  Duration: 00:05:10  Status: MONITORING                │ │
│ │    [View Details] [Acknowledge] [Escalate]                                  │ │
│ │                                                                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Alert Configuration Interface

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🚨 Alert Management                                          [Create Rule] [📤] │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌─ Active Alert Rules ─────────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ Rule Name               Metric         Condition    Severity   Status       │ │
│ │ ───────────────────────────────────────────────────────────────────────────  │ │
│ │ High CPU Usage          cpu_usage      > 80%       WARNING    🟢 Enabled    │ │
│ │ Database Slow Queries   query_time     > 1000ms    CRITICAL   🟢 Enabled    │ │
│ │ Low Disk Space         disk_usage      > 90%       CRITICAL   🟢 Enabled    │ │
│ │ Bot Response Timeout   response_time   > 5000ms    WARNING    🟢 Enabled    │ │
│ │ High Error Rate        error_rate      > 1%        CRITICAL   🟢 Enabled    │ │
│ │ User Session Spike     active_users    > 5000      INFO       🔴 Disabled   │ │
│ │                                                                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Notification Channels ──────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                 │ │
│ │ │      📧         │ │      💬         │ │      📱         │                 │ │
│ │ │     EMAIL       │ │     SLACK       │ │      SMS        │                 │ │
│ │ │                 │ │                 │ │                 │                 │ │
│ │ │  🟢 Connected   │ │  🟢 Connected   │ │  🔴 Disabled    │                 │ │
│ │ │ admin@rps.com   │ │ #bot-alerts     │ │ +1-555-0123     │                 │ │
│ │ │                 │ │                 │ │                 │                 │ │
│ │ │  [Configure]    │ │  [Configure]    │ │  [Configure]    │                 │ │
│ │ └─────────────────┘ └─────────────────┘ └─────────────────┘                 │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌─ Recent Alerts History ──────────────────────────────────────────────────────┐ │
│ │                                                                              │ │
│ │ 🔴 CRITICAL: Database connection failed                                      │ │
│ │    Time: 13:45:22   Duration: 00:02:15   Status: RESOLVED                   │ │
│ │    Action: Automatic failover to backup database                            │ │
│ │                                                                              │ │
│ │ 🟡 WARNING: High memory usage detected                                      │ │
│ │    Time: 13:28:45   Duration: 00:15:33   Status: RESOLVED                   │ │
│ │    Action: Memory cleanup routine executed                                   │ │
│ │                                                                              │ │
│ │ 🔵 INFO: Tournament T005 started successfully                               │ │
│ │    Time: 12:00:00   Duration: N/A       Status: INFO                        │ │
│ │    Action: No action required                                               │ │
│ │                                                                              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Mobile Responsive Layout

```
┌─────────────────────┐
│ 🎮 RPS Bot [🔔][👤] │
├─────────────────────┤
│                     │
│ ┌─ Quick Stats ───┐ │
│ │ Active: 1,247   │ │
│ │ Games: 89/min   │ │
│ │ Tournaments: 23 │ │
│ └─────────────────┘ │
│                     │
│ ┌─ Live Feed ─────┐ │
│ │ T001: Champ.    │ │
│ │ 24/32 - Round 3 │ │
│ │ [Monitor]       │ │
│ │                 │ │
│ │ T002: Quick     │ │
│ │ 8/8 - Finals    │ │
│ │ [Monitor]       │ │
│ └─────────────────┘ │
│                     │
│ ┌─ Navigation ────┐ │
│ │ 📊 Overview     │ │
│ │ 🏆 Tournaments  │ │
│ │ 👥 Players      │ │
│ │ 📈 Analytics    │ │
│ │ 🚨 Alerts       │ │
│ │ ⚙️ Settings     │ │
│ └─────────────────┘ │
│                     │
│ ┌─ System Status ─┐ │
│ │ 🟢 All Online   │ │
│ │ CPU: 78%        │ │
│ │ MEM: 62%        │ │
│ │ [Details]       │ │
│ └─────────────────┘ │
└─────────────────────┘
```

## Component Library Structure

```typescript
// Dashboard Component Hierarchy
src/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── common/
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   └── Chart.tsx
│   ├── tournament/
│   │   ├── TournamentCard.tsx
│   │   ├── TournamentBracket.tsx
│   │   ├── LiveMatch.tsx
│   │   └── TournamentList.tsx
│   ├── player/
│   │   ├── PlayerCard.tsx
│   │   ├── PlayerList.tsx
│   │   ├── PlayerProfile.tsx
│   │   └── PlayerStats.tsx
│   ├── analytics/
│   │   ├── KPICards.tsx
│   │   ├── UserActivityChart.tsx
│   │   ├── GameChoiceChart.tsx
│   │   └── RevenueChart.tsx
│   ├── monitoring/
│   │   ├── SystemHealth.tsx
│   │   ├── ServiceStatus.tsx
│   │   ├── AlertList.tsx
│   │   └── MetricsChart.tsx
│   └── admin/
│       ├── UserManagement.tsx
│       ├── TournamentAdmin.tsx
│       ├── SystemSettings.tsx
│       └── AlertConfiguration.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Tournaments.tsx
│   ├── Players.tsx
│   ├── Analytics.tsx
│   ├── Monitoring.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useWebSocket.ts
│   ├── useRealTimeData.ts
│   ├── useTournaments.ts
│   └── useSystemMetrics.ts
├── services/
│   ├── api.ts
│   ├── websocket.ts
│   └── auth.ts
└── utils/
    ├── formatters.ts
    ├── validators.ts
    └── constants.ts
```

## Color Scheme & Theme

```css
/* Primary Theme Colors */
:root {
  /* Status Colors */
  --status-online: #22c55e;
  --status-warning: #f59e0b;
  --status-error: #ef4444;
  --status-offline: #6b7280;
  
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-dark: #0f172a;
  
  /* Text Colors */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --text-white: #ffffff;
  
  /* Accent Colors */
  --accent-blue: #3b82f6;
  --accent-purple: #8b5cf6;
  --accent-green: #10b981;
  --accent-orange: #f97316;
  
  /* Game Choice Colors */
  --rock-color: #78716c;
  --paper-color: #3b82f6;
  --scissors-color: #ef4444;
  
  /* Border & Shadow */
  --border-light: #e2e8f0;
  --border-medium: #cbd5e1;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

/* Dark Theme */
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --border-light: #334155;
  --border-medium: #475569;
}

/* Component Styles */
.dashboard-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.dashboard-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-online {
  background: rgba(34, 197, 94, 0.1);
  color: var(--status-online);
}

.status-warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--status-warning);
}

.status-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--status-error);
}

.metric-card {
  text-align: center;
  padding: 2rem 1.5rem;
}

.metric-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.metric-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-change {
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 0.5rem;
}

.metric-change.positive {
  color: var(--status-online);
}

.metric-change.negative {
  color: var(--status-error);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
  transition: width 0.3s ease;
}

.tournament-bracket {
  display: flex;
  gap: 2rem;
  overflow-x: auto;
  padding: 1rem;
}

.bracket-round {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 200px;
}

.bracket-match {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 1rem;
  position: relative;
}

.match-live {
  border-color: var(--accent-green);
  background: rgba(16, 185, 129, 0.05);
}

.game-choice {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
}

.choice-rock {
  background: rgba(120, 113, 108, 0.1);
  color: var(--rock-color);
}

.choice-paper {
  background: rgba(59, 130, 246, 0.1);
  color: var(--paper-color);
}

.choice-scissors {
  background: rgba(239, 68, 68, 0.1);
  color: var(--scissors-color);
}
```

This comprehensive wireframe and component specification provides a detailed blueprint for implementing the dashboard interface with consistent design patterns, responsive layouts, and modern UI components.