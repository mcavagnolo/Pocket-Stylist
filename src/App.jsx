import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useSwipeable } from 'react-swipeable';
import { FaUserCircle } from 'react-icons/fa';
import banner from './assets/banner.png';

import Home from './pages/Home';
import Closet from './pages/Closet';
import CameraPage from './pages/Camera';
import Outfits from './pages/Outfits';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import NavBar from './components/NavBar';
import AccountModal from './components/AccountModal';

function AppContent() {
  const { currentUser } = useAuth();
  const [showAccount, setShowAccount] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const routes = ['/', '/closet', '/outfits', '/schedule'];

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = routes.indexOf(location.pathname);
      if (currentIndex < routes.length - 1) {
        navigate(routes[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      const currentIndex = routes.indexOf(location.pathname);
      if (currentIndex > 0) {
        navigate(routes[currentIndex - 1]);
      }
    },
    preventScrollOnSwipe: false, // Allow scrolling
    trackMouse: true,
    delta: 50 // Require a larger swipe to trigger navigation
  });

  if (!currentUser) {
    return <Login />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Image 
            source={{ uri: banner }} 
            style={{ width: 200, height: 40, resizeMode: 'contain' }} 
          />
        </View>
        <TouchableOpacity onPress={() => setShowAccount(true)}>
          <FaUserCircle size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content} {...handlers}>
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
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100vh',
    maxHeight: '100dvh',
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    position: 'fixed', // Ensure it stays fixed
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    zIndex: 10,
    height: 70, // Fixed height
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
    overflow: 'hidden', // Let children handle scrolling
  },
});

export default App;