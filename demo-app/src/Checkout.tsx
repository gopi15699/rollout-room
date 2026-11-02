import { Pressable, StyleSheet, Text, View } from 'react-native';

import { deliveryEstimate, Product, User } from './data';

type Props = {
  user: User;
  items: Product[];
  onBack: () => void;
  onPlaceOrder: () => void;
};

export function Checkout({ user, items, onBack, onPlaceOrder }: Props) {
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <View testID="checkout-screen">
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.line}>Ordering as {user.name}</Text>
      {items.map((item) => (
        <Text key={item.id} style={styles.line}>
          {item.name}: ₹{item.price}
        </Text>
      ))}
      <Text style={styles.total}>Total: ₹{total}</Text>
      <Text style={styles.line}>{deliveryEstimate(user.address!)}</Text>
      <Pressable style={styles.button} onPress={onPlaceOrder} testID="place-order">
        <Text style={styles.buttonText}>Place order</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onBack}>
        <Text>Back to shop</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  line: { fontSize: 16, marginBottom: 8 },
  total: { fontSize: 20, fontWeight: '600', marginVertical: 16 },
  button: { backgroundColor: '#1f6f54', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  secondary: { padding: 14, alignItems: 'center', marginTop: 8 },
});
