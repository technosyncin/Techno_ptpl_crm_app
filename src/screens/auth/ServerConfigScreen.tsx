import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  DEFAULT_API_URL,
  LIVE_TUNNEL_URL,
  LOCAL_MOBILE_API_URL,
  LOCAL_SERVER_API_URL,
  getAutoDetectedServerUrl,
  ENV_ENDPOINTS,
} from '../../api/client';
import axios from 'axios';

interface ServerConfigScreenProps {
  navigation: any;
}

export const ServerConfigScreen: React.FC<ServerConfigScreenProps> = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(getApiBaseUrl());
  }, []);

  const handleTestConnection = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a valid API URL');
      return;
    }
    setTesting(true);
    try {
      let target = url.trim();
      if (target.endsWith('/')) target = target.slice(0, -1);
      const start = Date.now();
      const headers = { 'Bypass-Tunnel-Reminder': 'true' };

      let status = 200;
      let serverName = 'Techno CRM Mobile API';
      try {
        // Try health endpoint first (matches Mobile API HealthController)
        const healthRes = await axios.get(`${target}/health`, { headers, timeout: 8000 });
        status = healthRes.status;
        serverName = healthRes.data?.server || serverName;
      } catch (healthErr: any) {
        try {
          // Try mobile ping
          const pingRes = await axios.get(`${target}/mobile/ping`, { headers, timeout: 8000 });
          status = pingRes.status;
          serverName = pingRes.data?.server || serverName;
        } catch (pingErr: any) {
          try {
            // Try generic ping
            const rootPing = await axios.get(`${target}/ping`, { headers, timeout: 8000 });
            status = rootPing.status;
            serverName = rootPing.data?.server || serverName;
          } catch (rootErr: any) {
            if (healthErr.response) {
              status = healthErr.response.status;
              serverName = healthErr.response.headers?.server || serverName;
            } else {
              // Try root or alternative endpoint
              try {
                const fallback = await axios.get(target, { headers, timeout: 8000 });
                status = fallback.status;
              } catch (fbErr: any) {
                if (fbErr.response) {
                  status = fbErr.response.status;
                } else {
                  throw fbErr;
                }
              }
            }
          }
        }
      }

      const duration = Date.now() - start;
      Alert.alert(
        'Connection Successful! 🟢',
        `Connected to Techno CRM Backend.\n\nLatency: ${duration}ms\nStatus: ${status}\nServer: ${serverName}`
      );
    } catch (err: any) {
      Alert.alert(
        'Connection Failed 🔴',
        `Could not reach server at ${url}.\n\nError: ${err.message || 'Network request failed'}\n\nPlease check your internet connection and server status.`
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setApiBaseUrl(url);
      Alert.alert('Saved', 'API Base URL updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save URL');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setUrl(DEFAULT_API_URL);
  };

  const setPreset = (presetUrl: string) => {
    setUrl(presetUrl);
  };

  return (
    <View style={styles.container}>
      <Header title="Server Configuration" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, Shadows.sm]}>
          <Text style={[Typography.h4, styles.cardTitle]}>Backend API Endpoint</Text>
          <Text style={[Typography.caption, styles.cardDesc]}>
            Configure the ASP.NET Core API server URL for Techno CRM.
          </Text>

          {/* Quick Preset Buttons */}
          <Text style={[Typography.captionBold, { color: Colors.slate700, marginBottom: 8 }]}>
            Quick Presets (Tap to Choose):
          </Text>
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={[styles.presetBtn, url === ENV_ENDPOINTS.test && styles.presetBtnActive]}
              onPress={() => setPreset(ENV_ENDPOINTS.test)}
            >
              <Text style={[styles.presetBtnText, url === ENV_ENDPOINTS.test && styles.presetBtnTextActive]}>
                ☁️ CRM Test (Online)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, url === ENV_ENDPOINTS.production && styles.presetBtnActive]}
              onPress={() => setPreset(ENV_ENDPOINTS.production)}
            >
              <Text style={[styles.presetBtnText, url === ENV_ENDPOINTS.production && styles.presetBtnTextActive]}>
                🚀 CRM Production
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, (url === 'http://192.168.1.12:5000/api' || url === 'http://localhost:5000/api') && styles.presetBtnActive]}
              onPress={() => setPreset('http://192.168.1.12:5000/api')}
            >
              <Text style={[styles.presetBtnText, (url === 'http://192.168.1.12:5000/api' || url === 'http://localhost:5000/api') && styles.presetBtnTextActive]}>
                💻 Local Mobile API (:5000)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, (url === 'http://192.168.1.12:5251/api' || url === 'http://localhost:5251/api') && styles.presetBtnActive]}
              onPress={() => setPreset('http://192.168.1.12:5251/api')}
            >
              <Text style={[styles.presetBtnText, (url === 'http://192.168.1.12:5251/api' || url === 'http://localhost:5251/api') && styles.presetBtnTextActive]}>
                🖥️ Local Web Server (:5251)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setPreset(getAutoDetectedServerUrl())}
            >
              <Text style={styles.presetBtnText}>
                ⚡ Auto-Detect Local IP
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="API Base URL"
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.12:5000/api"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="server-outline"
          />

          <View style={styles.hintBox}>
            <Text style={[Typography.captionBold, styles.hintTitle]}>Quick Tips for Testing:</Text>
            <Text style={[Typography.caption, styles.hintText]}>
              • Local Mobile API: http://192.168.1.12:5000/api (Active){'\n'}
              • Local Web Server: http://192.168.1.12:5251/api{'\n'}
              • CRM Test: https://crmtest.technosync.in/Mobile/api{'\n'}
              • Auto-Detect: Uses PC IP from active Expo Metro connection
            </Text>
          </View>

          <View style={styles.buttonCol}>
            <Button
              title="Test Connection"
              variant="outline"
              icon="flash-outline"
              loading={testing}
              onPress={handleTestConnection}
              fullWidth
            />

            <Button
              title="Save & Apply"
              variant="primary"
              loading={saving}
              onPress={handleSave}
              fullWidth
            />

            <Button
              title="Reset to Default"
              variant="secondary"
              onPress={handleReset}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    color: Colors.slate900,
    marginBottom: 4,
  },
  cardDesc: {
    color: Colors.slate500,
    marginBottom: Spacing.lg,
  },
  hintBox: {
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  hintTitle: {
    color: Colors.primary,
    marginBottom: 4,
  },
  hintText: {
    color: Colors.slate600,
    lineHeight: 18,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetBtnActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.slate700,
  },
  presetBtnTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  buttonCol: {
    gap: Spacing.md,
  },
});
