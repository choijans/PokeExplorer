import database from '@react-native-firebase/database';

class CurrencyService {
  async getBalance(userId: string): Promise<number> {
    const snapshot = await database().ref(`users/${userId}/coins`).once('value');
    return snapshot.val() || 0;
  }

  async addCoins(userId: string, amount: number): Promise<number> {
    const ref = database().ref(`users/${userId}/coins`);
    let newBalance = 0;
    
    await ref.transaction((current) => {
      newBalance = (current || 0) + amount;
      return newBalance;
    });
    
    return newBalance;
  }

  async deductCoins(userId: string, amount: number): Promise<boolean> {
    const ref = database().ref(`users/${userId}/coins`);
    let success = false;
    
    await ref.transaction((current) => {
      const balance = current || 0;
      if (balance >= amount) {
        success = true;
        return balance - amount;
      }
      return current;
    });
    
    return success;
  }
}

export const currencyService = new CurrencyService();
