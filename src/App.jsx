import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FaUserCircle } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import logo from './assets/PSBannerlogolong2.png';
import { theme } from './theme';

import Home from './pages/Home';
import Closet from './pages/Closet';
import CameraPage from './pages/Camera';
import Outfits from './pages/Outfits';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import NavBar from './components/NavBar';
import AccountModal from './components/AccountModal';

const variants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0
  })
};

const PageWrapper = ({ children, direction }) => (
  <motion.div
    custom={direction}
    variants={variants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
    className="page-wrapper"
    style={{ 
      height: '100%', 
      width: '100%', 
      backgroundColor: '#ffffff',
      position: 'absolute',
      top: 0,
      left: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden' // Let the inner ScrollView handle scrolling
    }}
  >
    {children}
  </motion.div>
);

function AppContent() {
  const { currentUser } = useAuth();
  const [showAccount, setShowAccount] = useState(false);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const routes = ['/', '/closet', '/outfits', '/schedule'];

  const handleNavigate = (path) => {
    const currentIndex = routes.indexOf(location.pathname);
    const newIndex = routes.indexOf(path);
    setDirection(newIndex > currentIndex ? 1 : -1);
    navigate(path);
  };

  if (!currentUser) {
    return <Login />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Image 
            source={{ uri: logo }} 
            style={{ width: 270, height: 78, resizeMode: 'contain', marginLeft: 10 }} 
          />
        </View>
        <TouchableOpacity onPress={() => setShowAccount(true)}>
          <FaUserCircle size={34} color={theme.colors.highlight} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <AnimatePresence mode="popLayout" custom={direction}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper direction={direction}><Home /></PageWrapper>} />
            <Route path="/closet" element={<PageWrapper direction={direction}><Closet /></PageWrapper>} />
            <Route path="/camera" element={<PageWrapper direction={direction}><CameraPage /></PageWrapper>} />
            <Route path="/outfits" element={<PageWrapper direction={direction}><Outfits /></PageWrapper>} />
            <Route path="/schedule" element={<PageWrapper direction={direction}><Schedule /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </View>
      <NavBar onNavigate={handleNavigate} />
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
    backgroundColor: '#ffffff',
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
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: 15, // Adjust for status bar if needed
    zIndex: 10,
    height: 70, // Fixed height
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  accountButton: {
    color: theme.colors.highlight,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    position: 'relative', // Ensure PageWrapper stays within this bounds
    marginBottom: 80, // Space for NavBar (which is absolute bottom)
    overflow: 'hidden', // Let children handle scrolling
  },
});

export default App;