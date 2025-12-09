import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Home from './pages/Home';
import Closet from './pages/Closet';
import CameraPage from './pages/Camera';
import Outfits from './pages/Outfits';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import NavBar from './components/NavBar';
import AccountModal from './components/AccountModal';

function App() {
  const { currentUser } = useAuth();
  const [showAccount, setShowAccount] = useState(false);

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Router>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pocket Stylist</Text>
          <TouchableOpacity onPress={() => setShowAccount(true)}>
            <Text style={styles.accountButton}>Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/closet" element={<Closet />} />
            <Route path="/camera" element={<CameraPage />} />
            <Route path="/outfits" element={<Outfits />} />
            <Route path="/schedule" element={<Schedule />} />
          </Routes>
        </View>
        <NavBar />
        <AccountModal visible={showAccount} onClose={() => setShowAccount(false)} />
      </View>
    </Router>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 15, // Adjust for status bar if needed
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  accountButton: {
    color: '#007AFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingBottom: 60, // Space for NavBar
  },
});

export default App;