import React, { ReactNode } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const { width } = Dimensions.get('window');

const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  type = 'info',
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
}) => {
  const backgroundColor = {
    info: 'rgba(255,255,255,0.15)',
    success: 'rgba(0,200,0,0.15)',
    warning: 'rgba(200,150,0,0.15)',
    error: 'rgba(200,0,0,0.15)',
  }[type];

  const borderColor = {
    info: 'rgba(255,255,255,0.3)',
    success: 'rgba(0,200,0,0.3)',
    warning: 'rgba(200,150,0,0.3)',
    error: 'rgba(200,0,0,0.3)',
  }[type];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor, borderColor }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {onCancel && (
              <TouchableOpacity onPress={onCancel} style={styles.button}>
                <Text style={styles.buttonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            {onConfirm && (
              <TouchableOpacity onPress={onConfirm} style={styles.button}>
                <Text style={styles.buttonText}>{confirmText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modal: {
    width: width * 0.8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    // glass‑morphism effect
    backdropFilter: 'blur(10px)', // Note: not supported on native, kept for web compatibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#fff',
  },
  message: {
    fontSize: 16,
    color: '#ddd',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default AlertModal;
