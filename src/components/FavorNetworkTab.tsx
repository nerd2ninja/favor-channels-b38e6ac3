import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getFavorChannels } from '@/data/favorChannels';
import { getPublicKey } from 'nostr-tools';
import { Network } from 'lucide-react';

// Mock private key for demo - same as in favorChannels.ts
const MOCK_PRIVATE_KEY = new Uint8Array(32).fill(0xa);

export default function FavorNetworkTab() {
  const channels = getFavorChannels();
  const userNpub = `npub1${getPublicKey(MOCK_PRIVATE_KEY)}`;

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Add user node (center, distinct styling)
    nodes.push({
      id: 'user',
      type: 'default',
      position: { x: 400, y: 300 },
      data: { 
        label: 'You',
      },
      style: {
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
        color: 'white',
        border: '2px solid hsl(var(--primary))',
        borderRadius: '50%',
        width: 80,
        height: 80,
        fontSize: '14px',
        fontWeight: 'bold',
      },
    });

    // Add nodes for each person and connections
    channels.forEach((channel, index) => {
      const angle = (index * 2 * Math.PI) / channels.length;
      const radius = 200;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      const truncatedNpub = channel.npub.length > 12 
        ? `${channel.npub.slice(0, 8)}...${channel.npub.slice(-4)}`
        : channel.npub;

      // Add person node
      nodes.push({
        id: channel.npub,
        type: 'default',
        position: { x, y },
        data: { 
          label: truncatedNpub,
        },
        style: {
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          fontSize: '12px',
          width: 120,
          height: 60,
        },
      });

      // Add edges based on favor balances
      if (channel.favorsOwed > 0) {
        // User owes this person
        edges.push({
          id: `user-owes-${channel.npub}`,
          source: 'user',
          target: channel.npub,
          label: `You owe ${channel.favorsOwed}`,
          style: { 
            stroke: 'hsl(var(--destructive))',
            strokeWidth: Math.min(channel.favorsOwed * 2, 8),
          },
          labelStyle: {
            fontSize: '11px',
            fontWeight: 'bold',
            fill: 'hsl(var(--destructive))',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'hsl(var(--destructive))',
          },
        });
      }

      if (channel.favorsOwedToThem > 0) {
        // This person owes the user
        edges.push({
          id: `${channel.npub}-owes-user`,
          source: channel.npub,
          target: 'user',
          label: `Owes you ${channel.favorsOwedToThem}`,
          style: { 
            stroke: 'hsl(var(--primary))',
            strokeWidth: Math.min(channel.favorsOwedToThem * 2, 8),
          },
          labelStyle: {
            fontSize: '11px',
            fontWeight: 'bold',
            fill: 'hsl(var(--primary))',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'hsl(var(--primary))',
          },
        });
      }
    });

    return { nodes, edges };
  }, [channels, userNpub]);

  return (
    <div className="h-screen w-full pb-20">
      <div className="h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="top-right"
          style={{ background: 'hsl(var(--background))' }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background 
            color="hsl(var(--muted-foreground) / 0.2)" 
            gap={20}
            size={1}
          />
          <Controls className="[&_button]:bg-card [&_button]:border-border [&_button]:text-foreground" />
          <MiniMap 
            className="bg-card border-border"
            nodeColor={(node) => {
              if (node.id === 'user') return 'hsl(var(--primary))';
              return 'hsl(var(--muted))';
            }}
          />
        </ReactFlow>
      </div>
      
      {channels.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Favor Network Yet</h3>
            <p className="text-muted-foreground">
              Add favor channels to see your network visualization
            </p>
          </div>
        </div>
      )}
    </div>
  );
}