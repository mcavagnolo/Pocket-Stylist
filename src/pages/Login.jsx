import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { login, signup, resetPassword } from '../services/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (resetMode) {
        await resetPassword(email);
        setMessage('Check your email for password reset instructions.');
        setResetMode(false);
      } else if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: '/pwa-192x192.png' }} 
        style={{ width: 100, height: 100, marginBottom: 20, alignSelf: 'center' }} 
      />
      <View style={styles.card}>
        <Text style={styles.title}>
          {resetMode ? 'Reset Password' : (isLogin ? 'Pocket Stylist Login' : 'Create Account')}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {!resetMode && (
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        )}

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {resetMode ? 'Send Reset Email' : (isLogin ? 'Log In' : 'Sign Up')}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          {resetMode ? (
            <TouchableOpacity onPress={() => setResetMode(false)}>
              <Text style={styles.link}>Back to Login</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text style={styles.link}>
                  {isLogin ? 'Need an account? Sign Up' : 'Have an account? Log In'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setResetMode(true)}>
                <Text style={[styles.link, styles.forgotLink]}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
    height: '100vh',
  },
  card: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  success: {
    color: 'green',
    marginBottom: 15,
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    color: '#007AFF',
    marginTop: 10,
  },
  forgotLink: {
    color: '#666',
    fontSize: 12,
  }
});
