import database from '@react-native-firebase/database';

export interface LevelData {
  level: number;
  xp: number;
  totalXP: number;
}

class LevelService {
  getXPForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level - 1, 1.5));
  }

  getLevelFromTotalXP(totalXP: number): number {
    let level = 1;
    while (this.getXPForLevel(level + 1) <= totalXP) {
      level++;
    }
    return level;
  }

  async getLevelData(userId: string): Promise<LevelData> {
    const snapshot = await database().ref(`users/${userId}`).once('value');
    const data = snapshot.val();
    
    const totalXP = data?.totalXP || 0;
    const level = this.getLevelFromTotalXP(totalXP);
    const xpForCurrentLevel = this.getXPForLevel(level);
    const xpForNextLevel = this.getXPForLevel(level + 1);
    const xp = totalXP - xpForCurrentLevel;
    
    return { level, xp, totalXP };
  }

  async addXP(userId: string, amount: number): Promise<{ leveledUp: boolean; newLevel: number; totalXP: number }> {
    const oldData = await this.getLevelData(userId);
    const newTotalXP = oldData.totalXP + amount;
    const newLevel = this.getLevelFromTotalXP(newTotalXP);
    
    await database().ref(`users/${userId}`).update({
      totalXP: newTotalXP,
      level: newLevel,
    });
    
    return {
      leveledUp: newLevel > oldData.level,
      newLevel,
      totalXP: newTotalXP,
    };
  }

  getXPForNextLevel(level: number): number {
    return this.getXPForLevel(level + 1) - this.getXPForLevel(level);
  }
}

export const levelService = new LevelService();
