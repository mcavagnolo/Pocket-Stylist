import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigate, useLocation } from 'react-router-dom';
import { theme } from '../theme';

export default function NavBar({ onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handlePress = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const tabs = [
    { name: 'Home', path: '/' },
    { name: 'Closet', path: '/closet' },
    { name: 'Style', path: '/outfits' },
    { name: 'Plan', path: '/schedule' },
  ];

  return (
    <View style={styles.navBar}>
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <TouchableOpacity
            key={tab.name}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => handlePress(tab.path)}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 20, // Safe area for bottom
    paddingTop: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    alignItems: 'center',
    padding: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.highlight,
  },
  tabText: {
    fontSize: 16,
    color: theme.colors.secondaryText,
  },
  activeTabText: {
    color: theme.colors.highlight,
    fontWeight: 'bold',
  },
});
