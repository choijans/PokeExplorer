import database from '@react-native-firebase/database';
import { ItemEffect } from './shopService';

export interface ActiveEffect {
  itemId: string;
  effect: ItemEffect;
  activatedAt: number;
  expiresAt: number;
}

class ActiveEffectsService {
  async activateEffect(userId: string, itemId: string, effect: ItemEffect): Promise<void> {
    if (!effect.duration) return;
    
    const activeEffect: ActiveEffect = {
      itemId,
      effect,
      activatedAt: Date.now(),
      expiresAt: Date.now() + (effect.duration * 1000),
    };
    
    await database().ref(`users/${userId}/activeEffects/${itemId}`).set(activeEffect);
  }

  async getActiveEffects(userId: string): Promise<ActiveEffect[]> {
    const snapshot = await database().ref(`users/${userId}/activeEffects`).once('value');
    const data = snapshot.val();
    if (!data) return [];
    
    const now = Date.now();
    const effects: ActiveEffect[] = [];
    
    for (const [id, effect] of Object.entries(data as Record<string, ActiveEffect>)) {
      if (effect.expiresAt > now) {
        effects.push(effect);
      } else {
        await database().ref(`users/${userId}/activeEffects/${id}`).remove();
      }
    }
    
    return effects;
  }

  async getEffectValue(userId: string, effectType: string): Promise<number> {
    const effects = await this.getActiveEffects(userId);
    const effect = effects.find(e => e.effect.type === effectType);
    return effect?.effect.value || 0;
  }

  async hasActiveEffect(userId: string, effectType: string): Promise<boolean> {
    const effects = await this.getActiveEffects(userId);
    return effects.some(e => e.effect.type === effectType);
  }

  async applyToCaptureConfig(userId: string, baseConfig: any): Promise<any> {
    const effects = await this.getActiveEffects(userId);
    let config = { ...baseConfig };
    
    for (const effect of effects) {
      switch (effect.effect.type) {
        case 'fill-speed':
          config.fillSpeed += effect.effect.value;
          break;
        case 'drain-speed':
          config.drainSpeed = (config.drainSpeed || 0) + effect.effect.value;
          break;
        case 'zone-size':
          config.sweetSpotSize += effect.effect.value;
          break;
        case 'acceleration':
          config.accelerationMultiplier = effect.effect.value;
          break;
      }
    }
    
    return config;
  }
}

export const activeEffectsService = new ActiveEffectsService();
