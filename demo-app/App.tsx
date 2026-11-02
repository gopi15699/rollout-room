import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Settings,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Checkout } from './src/Checkout';
import { APP_VERSION, PRODUCTS, Product, User, USERS } from './src/data';

type Screen = 'shop' | 'checkout' | 'done';

// Opens checkout directly, so a crash can be reproduced on a simulator with a
// single command. iOS asks before following basket://checkout?user=guest, but
// not for the launch argument:
//   xcrun simctl launch <udid> dev.rolloutroom.basket -basketCheckoutUser guest
function launchArgumentUser(): User | null {
  if (Platform.OS !== 'ios') return null;
  return USERS[Settings.get('basketCheckoutUser')] ?? null;
}

function parseCheckoutLink(url: string): User | null {
  const match = url.match(/^basket:\/\/checkout(?:\?user=(\w+))?/);
  if (!match) return null;
  return USERS[match[1] ?? 'member'] ?? null;
}

export default function App() {
  const [user, setUser] = useState<User>(USERS.member);
  const [cart, setCart] = useState<Product[]>([]);
  const [screen, setScreen] = useState<Screen>('shop');

  useEffect(() => {
    const openCheckout = (linkedUser: User | null) => {
      if (!linkedUser) return;
      setUser(linkedUser);
      setCart([PRODUCTS[0]]);
      setScreen('checkout');
    };
    const openUrl = (url?: string | null) => openCheckout(url ? parseCheckoutLink(url) : null);

    openCheckout(launchArgumentUser());
    Linking.getInitialURL().then(openUrl);
    const subscription = Linking.addEventListener('url', (event) => openUrl(event.url));
    return () => subscription.remove();
  }, []);

  const startOver = () => {
    setCart([]);
    setScreen('shop');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.version} testID="app-version">
        Basket v{APP_VERSION}
      </Text>

      {screen === 'shop' && (
        <View>
          <Text style={styles.title}>Shop</Text>
          <View style={styles.row}>
            {Object.values(USERS).map((option) => (
              <Pressable
                key={option.id}
                style={[styles.chip, option.id === user.id && styles.chipActive]}
                onPress={() => setUser(option)}
              >
                <Text>{option.name}</Text>
              </Pressable>
            ))}
          </View>
          {PRODUCTS.map((product) => (
            <Pressable
              key={product.id}
              style={styles.product}
              onPress={() => setCart((items) => [...items, product])}
            >
              <Text>{product.name}</Text>
              <Text>₹{product.price}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.button, cart.length === 0 && styles.buttonDisabled]}
            disabled={cart.length === 0}
            onPress={() => setScreen('checkout')}
            testID="go-to-checkout"
          >
            <Text style={styles.buttonText}>Checkout ({cart.length})</Text>
          </Pressable>
        </View>
      )}

      {screen === 'checkout' && (
        <Checkout
          user={user}
          items={cart}
          onBack={() => setScreen('shop')}
          onPlaceOrder={() => setScreen('done')}
        />
      )}

      {screen === 'done' && (
        <View testID="order-confirmed">
          <Text style={styles.title}>Order placed</Text>
          <Pressable style={styles.button} onPress={startOver}>
            <Text style={styles.buttonText}>Keep shopping</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 24, paddingTop: 72 },
  version: { color: '#667', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eef' },
  chipActive: { backgroundColor: '#bfe3d3' },
  product: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: '#dde',
    borderRadius: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#1f6f54',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
