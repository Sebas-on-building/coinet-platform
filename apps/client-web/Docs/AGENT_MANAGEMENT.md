# Agent Management Enhancement Documentation

This document covers the enhanced agent management system with marketplace, performance analytics, testing sandbox, and collaborative features.

## Features Overview

### 1. Agent Template Marketplace
**Component:** `AgentMarketplace`
**Location:** `src/components/agents/AgentMarketplace.tsx`

Browse, search, and install pre-built AI agent templates.

**Features:**
- 🛍️ Browse curated agent templates
- 🔍 Search by name, description, or tags
- 🏷️ Filter by category (Trading, Research, DeFi, Analysis)
- ⭐ Sort by popularity, rating, or recency
- 👤 View author information and reviews
- 📊 See download stats and ratings
- 💎 Featured and PRO templates
- 📦 One-click installation

**Template Categories:**
- **Trading**: Trading strategies and execution
- **Analysis**: Market analysis and technical indicators
- **Research**: Fundamental analysis and due diligence
- **DeFi**: DeFi protocols and yield optimization
- **General**: Multi-purpose agents

**Usage:**
```tsx
import { AgentMarketplace } from '@/components/agents';

function AgentManagement() {
  const handleInstall = (template) => {
    // Create agent from template
    createAgent(template);
  };

  return (
    <AgentMarketplace onInstallTemplate={handleInstall} />
  );
}
```

**Template Metadata:**
- Downloads count
- Star rating (1-5)
- Number of reviews
- Author information
- Last updated timestamp
- Tags for searchability
- Featured/PRO badges

### 2. Agent Performance Analytics
**Component:** `AgentPerformanceAnalytics`
**Location:** `src/components/agents/AgentPerformanceAnalytics.tsx`

Comprehensive performance tracking and analytics dashboard.

**Key Metrics:**
- 💰 Total Return (profit/loss)
- 🎯 Win Rate (successful executions)
- ⚡ Total Executions
- ⏱️ Average Execution Time
- 🏆 Sharpe Ratio
- 📉 Max Drawdown

**Chart Views:**
1. **Overview**: Profit over time with multiple metric views
2. **Trades**: Detailed trade history and execution log
3. **Distribution**: Profit distribution and performance breakdown
4. **Comparison**: Benchmark comparison against market average

**Usage:**
```tsx
import { AgentPerformanceAnalytics } from '@/components/agents';

function AgentDashboard({ agent }) {
  return (
    <AgentPerformanceAnalytics agent={agent} />
  );
}
```

**Performance Metrics:**
- Daily/weekly/monthly profit tracking
- Execution success rates
- Time-series performance charts
- Trade distribution analysis
- Risk-adjusted returns
- Benchmark comparisons

**Export Options:**
- Export data as CSV/JSON
- Share performance reports
- Generate PDF summaries

### 3. Agent Testing Sandbox
**Component:** `AgentTestingSandbox`
**Location:** `src/components/agents/AgentTestingSandbox.tsx`

Safe environment to test agents before production deployment.

**Test Scenarios:**
- 🐂 **Bull Run**: Strong upward trend, high volume
- 🐻 **Bear Market**: Downward trend, panic selling
- ↔️ **Sideways Market**: Range-bound, low volatility
- ⚡ **Flash Crash**: Sudden decline with recovery

**Configuration Options:**
- Initial capital amount
- Position sizing limits
- Stop loss percentage
- Take profit targets
- Test speed multiplier (0.5x - 10x)
- Risk management toggle
- Logging verbosity

**Test Views:**
1. **Live View**: Real-time execution monitoring
2. **Results**: Test summary and statistics
3. **Logs**: Detailed execution logs
4. **Code**: Agent configuration and parameters

**Usage:**
```tsx
import { AgentTestingSandbox } from '@/components/agents';

function TestAgent({ agent }) {
  const handleSaveTest = (results) => {
    // Save test results for analysis
    saveTestResults(results);
  };

  return (
    <AgentTestingSandbox 
      agent={agent}
      onSaveTest={handleSaveTest}
    />
  );
}
```

**Test Controls:**
- ▶️ Start/Resume test
- ⏸️ Pause test execution
- ⏹️ Stop test
- 🔄 Reset to initial state
- ⚡ Adjust speed multiplier
- 💾 Save test results

**Test Results Include:**
- Execution timeline
- Success/failure rates
- Action logs with metrics
- Performance statistics
- Risk management validation

### 4. Collaborative Agent Features
**Component:** `CollaborativeAgentFeatures`
**Location:** `src/components/agents/CollaborativeAgentFeatures.tsx`

Share agents, collaborate with team members, and manage permissions.

**Collaboration Features:**
- 👥 **Team Collaboration**: Invite collaborators with role-based access
- 💬 **Comments**: Discuss and provide feedback
- 🍴 **Fork Agents**: Create custom copies
- 🔗 **Share Links**: Generate shareable URLs
- 🌐 **Public/Private**: Toggle visibility
- ⭐ **Stars**: Community engagement
- 👁️ **View Tracking**: Analytics on agent usage

**User Roles:**
- 👑 **Owner**: Full control, can delete agent
- ✏️ **Editor**: Can modify and configure agent
- 👀 **Viewer**: Read-only access

**Usage:**
```tsx
import { CollaborativeAgentFeatures } from '@/components/agents';

function AgentCollaboration({ agent, onUpdate }) {
  return (
    <CollaborativeAgentFeatures 
      agent={agent}
      onUpdate={onUpdate}
    />
  );
}
```

**Collaboration Actions:**

1. **Share Agent:**
```typescript
// Invite by email with role
handleShare(email: string, role: 'editor' | 'viewer')

// Copy shareable link
handleCopyLink()

// Toggle public/private
handleTogglePublic()
```

2. **Fork Agent:**
```typescript
// Create a fork with custom name
handleFork(name: string, description: string)
```

3. **Comments & Discussion:**
```typescript
// Add comment
handleAddComment(content: string)

// Reply to comment
handleReply(commentId: string, content: string)

// Like comment
handleLikeComment(commentId: string)
```

**Permissions Matrix:**

| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View Agent | ✅ | ✅ | ✅ |
| Edit Configuration | ✅ | ✅ | ❌ |
| Delete Agent | ✅ | ❌ | ❌ |
| Share Agent | ✅ | ✅ | ❌ |
| Fork Agent | ✅ | ✅ | ✅ |
| Add Comments | ✅ | ✅ | ✅ |
| Manage Collaborators | ✅ | ❌ | ❌ |

## Integration Example

```tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AgentMarketplace,
  AgentPerformanceAnalytics,
  AgentTestingSandbox,
  CollaborativeAgentFeatures,
} from '@/components/agents';
import { useCustomAgents } from '@/hooks/useCustomAgents';

function AgentManagementHub() {
  const { agents, createAgent, updateAgent } = useCustomAgents();
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);

  const handleInstallTemplate = (template) => {
    const newAgent = createAgent({
      name: template.name,
      description: template.description,
      personality: template.personality,
      expertise: template.expertise,
      systemPrompt: template.systemPrompt,
      color: template.color,
      isActive: false,
    });
    setSelectedAgent(newAgent);
    toast.success('Agent installed!');
  };

  return (
    <Tabs defaultValue="marketplace">
      <TabsList>
        <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="testing">Testing</TabsTrigger>
        <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
      </TabsList>

      <TabsContent value="marketplace">
        <AgentMarketplace onInstallTemplate={handleInstallTemplate} />
      </TabsContent>

      <TabsContent value="analytics">
        {selectedAgent && (
          <AgentPerformanceAnalytics agent={selectedAgent} />
        )}
      </TabsContent>

      <TabsContent value="testing">
        {selectedAgent && (
          <AgentTestingSandbox
            agent={selectedAgent}
            onSaveTest={(results) => console.log('Test results:', results)}
          />
        )}
      </TabsContent>

      <TabsContent value="collaboration">
        {selectedAgent && (
          <CollaborativeAgentFeatures
            agent={selectedAgent}
            onUpdate={(updates) => updateAgent(selectedAgent.id, updates)}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
```

## Backend Integration

For production deployment, connect to Supabase to persist data:

### Database Schema

```sql
-- Agent templates table
CREATE TABLE agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  downloads INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_pro BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent collaborators table
CREATE TABLE agent_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, user_id)
);

-- Agent comments table
CREATE TABLE agent_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  parent_id UUID REFERENCES agent_comments(id),
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent test results table
CREATE TABLE agent_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  scenario_id TEXT NOT NULL,
  results JSONB NOT NULL,
  success_rate REAL,
  profit_loss REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
-- Agent templates are public for reading
CREATE POLICY "Anyone can view agent templates"
  ON agent_templates FOR SELECT
  USING (true);

-- Users can only modify their own templates
CREATE POLICY "Users can manage their own templates"
  ON agent_templates FOR ALL
  USING (auth.uid() = author_id);

-- Collaborators can view agents they have access to
CREATE POLICY "Collaborators can view agents"
  ON agent_collaborators FOR SELECT
  USING (user_id = auth.uid());

-- Comments are public on public agents
CREATE POLICY "Users can comment on agents"
  ON agent_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Best Practices

1. **Marketplace:**
   - Keep template descriptions clear and concise
   - Use relevant tags for discoverability
   - Update templates regularly
   - Respond to user feedback

2. **Performance Analytics:**
   - Track metrics consistently
   - Compare against benchmarks
   - Export data for external analysis
   - Monitor real-time performance

3. **Testing Sandbox:**
   - Test in multiple market scenarios
   - Use realistic capital amounts
   - Enable risk management
   - Review logs thoroughly before production

4. **Collaboration:**
   - Use appropriate role assignments
   - Document changes in comments
   - Fork before major modifications
   - Keep agents private during development

## Mobile Support

All agent management components are fully responsive and support:
- Touch gestures for navigation
- Swipe actions for quick operations
- Bottom sheets for mobile actions
- Haptic feedback on interactions
- Pull-to-refresh for data updates

## Security Considerations

1. **Access Control:**
   - Role-based permissions enforced
   - Owner-only destructive actions
   - Secure sharing mechanisms

2. **Data Privacy:**
   - Private agents hidden from public
   - Encrypted sensitive data
   - Audit logging for changes

3. **Testing Safety:**
   - Sandbox isolated from production
   - No real trades in test mode
   - Clear indicators of test vs. production

## Performance Optimizations

- Lazy loading of marketplace templates
- Virtualized long lists
- Debounced search
- Memoized calculations
- Progressive data loading
- Efficient state management

## Future Enhancements

- Real-time collaboration editing
- Advanced backtesting engine
- Machine learning optimization
- Community marketplace
- Template versioning
- Automated testing pipelines
- Integration with trading platforms

## Troubleshooting

**Marketplace not loading?**
- Check network connection
- Verify template data source
- Clear cache and reload

**Analytics not updating?**
- Check agent execution logs
- Verify performance tracking enabled
- Refresh data manually

**Test sandbox failing?**
- Review test configuration
- Check scenario compatibility
- Verify agent triggers properly configured

**Collaboration issues?**
- Verify user permissions
- Check network connectivity
- Ensure proper authentication

## API Reference

### AgentMarketplace Props
```typescript
interface AgentMarketplaceProps {
  onInstallTemplate: (template: AgentTemplate) => void;
  className?: string;
}
```

### AgentPerformanceAnalytics Props
```typescript
interface AgentPerformanceAnalyticsProps {
  agent: CustomAgent;
  className?: string;
}
```

### AgentTestingSandbox Props
```typescript
interface AgentTestingSandboxProps {
  agent: CustomAgent;
  onSaveTest: (results: any) => void;
  className?: string;
}
```

### CollaborativeAgentFeatures Props
```typescript
interface CollaborativeAgentFeaturesProps {
  agent: CustomAgent;
  onUpdate: (updates: Partial<CustomAgent>) => void;
  className?: string;
}
```

## Examples

### Installing a Template from Marketplace
```tsx
const marketplace = (
  <AgentMarketplace
    onInstallTemplate={(template) => {
      const agent = createAgent({
        name: template.name,
        description: template.description,
        personality: template.personality,
        expertise: template.expertise,
        systemPrompt: template.systemPrompt,
        color: template.color,
        isActive: true,
      });
      toast.success(`${template.name} installed!`);
    }}
  />
);
```

### Running Performance Analysis
```tsx
const analytics = (
  <AgentPerformanceAnalytics agent={selectedAgent} />
);
// Automatically displays:
// - Real-time performance charts
// - Key metrics dashboard
// - Trade history
// - Benchmark comparisons
```

### Testing in Sandbox
```tsx
const sandbox = (
  <AgentTestingSandbox
    agent={selectedAgent}
    onSaveTest={(results) => {
      // Save results to database
      saveTestResults(results);
      // Update agent based on test insights
      updateAgent(selectedAgent.id, {
        performance: calculatePerformance(results)
      });
    }}
  />
);
```

### Enabling Collaboration
```tsx
const collaboration = (
  <CollaborativeAgentFeatures
    agent={selectedAgent}
    onUpdate={(updates) => {
      updateAgent(selectedAgent.id, updates);
      // Sync changes with collaborators
      notifyCollaborators(selectedAgent.id, updates);
    }}
  />
);
```

## Keyboard Shortcuts

- `⌘⇧N` - Create new agent from template
- `⌘⇧T` - Open testing sandbox
- `⌘⇧A` - View performance analytics
- `⌘⇧S` - Share agent
- `⌘⇧F` - Fork agent
- `⌘/` - Search marketplace

## Accessibility

All components support:
- Screen reader compatibility
- Keyboard navigation
- ARIA labels and roles
- Focus management
- High contrast modes

## Related Documentation

- [Agent Types Reference](../src/types/agents.ts)
- [Agent Hooks](../src/hooks/useCustomAgents.ts)
- [Performance Monitoring](./PERFORMANCE.md)
- [Navigation System](./NAVIGATION.md)
