export class PricingService {
  private rarityMultipliers = {
    common: 100,
    uncommon: 250,
    rare: 500,
    epic: 1000,
    legendary: 2500,
  };

  calculatePrice(weight: number, rarity: string): number {
    const multiplier = this.rarityMultipliers[rarity as keyof typeof this.rarityMultipliers] || 100;
    return Math.floor(weight * multiplier);
  }

  calculateBulkPrice(instances: Array<{ weight: number; rarity: string }>): number {
    return instances.reduce((total, instance) => {
      return total + this.calculatePrice(instance.weight, instance.rarity);
    }, 0);
  }
}

export const pricingService = new PricingService();
