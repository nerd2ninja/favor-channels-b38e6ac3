import type { FavorEvent } from "../lib/protocol/events";

interface Preapproval {
  channelId: string;
  maxAmount: number;
  expiration: number;
  version: number;
}

export class FavorStore {
  private balances: Record<string, number> = {};
  private preapprovals: Preapproval[] = [];
  private latestVersion: Record<string, number> = {};

  applyEvent(event: FavorEvent) {
    // Prevent replay attacks by version
    if (
      this.latestVersion[event.channelId] &&
      event.version <= this.latestVersion[event.channelId]
    ) {
      console.warn("Ignoring old/replayed event");
      return;
    }

    switch (event.type) {
      case "favor:settlement":
        // No balances applied in demo; handled manually by user later
        break;

      case "favor:preapproval":
        this.preapprovals.push({
          channelId: event.channelId,
          maxAmount: (event.payload as any).maxAmount,
          expiration: event.expiration!,
          version: event.version,
        });
        break;
    }

    this.latestVersion[event.channelId] = event.version;
  }

  getValidPreapprovals(channelId: string, now: number): Preapproval[] {
    return this.preapprovals.filter(
      (p) => p.channelId === channelId && p.expiration > now
    );
  }
}
