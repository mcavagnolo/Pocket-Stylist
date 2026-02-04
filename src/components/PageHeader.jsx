import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FaInfoCircle } from 'react-icons/fa';

const PageHeader = ({ title, onInfoPress, rightContent }) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftContainer}>
        <Text style={styles.title}>{title}</Text>
        {onInfoPress && (
          <TouchableOpacity onPress={onInfoPress} style={styles.infoButton}>
            <FaInfoCircle size={16} color="#FF4081" />
          </TouchableOpacity>
        )}
      </View>
      {rightContent && (
        <View style={styles.rightContainer}>
          {rightContent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginBottom: 10,
    width: '100%',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28, // Common font size
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 'bold',
    color: '#333',
  },
  infoButton: {
    marginLeft: 10,
    justifyContent: 'center',
    paddingTop: 4, // Visual alignment
  },
  rightContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 10,
  },
});

export default PageHeader;
