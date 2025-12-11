const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to allow screen recording on Android
 * This removes FLAG_SECURE that prevents screen capture
 * 
 * IMPORTANT: This only works with development builds, not Expo Go
 */
const withAllowScreenRecording = (config) => {
  // First, ensure we have the Android manifest configured
  config = withAndroidManifest(config, (config) => {
    return config;
  });

  // Then modify MainActivity.java to remove FLAG_SECURE
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const mainActivityPath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        ...config.android.package.split('.'),
        'MainActivity.java'
      );

      // Only modify if the file exists (development build)
      if (fs.existsSync(mainActivityPath)) {
        let mainActivityContent = fs.readFileSync(mainActivityPath, 'utf8');

        // Check if we've already added the fix
        if (!mainActivityContent.includes('clearSecureFlag()')) {
          // Add import if not present
          if (!mainActivityContent.includes('import android.view.WindowManager;')) {
            mainActivityContent = mainActivityContent.replace(
              /(import android\.os\.Bundle;)/,
              '$1\nimport android.view.WindowManager;'
            );
          }

          // Helper method to clear FLAG_SECURE
          const clearFlagSecureMethod = `
  private void clearSecureFlag() {
    // Remove FLAG_SECURE to allow screen recording (for demo purposes)
    // This is called multiple times to ensure it stays cleared even when
    // secureTextEntry fields trigger the security flag
    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
  }`;

          // Add helper method if not present
          if (!mainActivityContent.includes('private void clearSecureFlag()')) {
            // Insert before the last closing brace of the class
            mainActivityContent = mainActivityContent.replace(
              /(\s+)\}$/,
              `$1${clearFlagSecureMethod}\n$1}`
            );
          }

          // Modify onCreate to clear FLAG_SECURE
          if (mainActivityContent.includes('protected void onCreate(Bundle savedInstanceState)')) {
            if (!mainActivityContent.includes('clearSecureFlag()')) {
              mainActivityContent = mainActivityContent.replace(
                /(protected void onCreate\(Bundle savedInstanceState\)\s*\{[^}]*super\.onCreate\(savedInstanceState\);)/,
                `$1\n    clearSecureFlag();`
              );
            }
          } else {
            // If onCreate doesn't exist, add it
            const onCreateMethod = `
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    clearSecureFlag();
  }`;
            
            // Insert after class declaration
            mainActivityContent = mainActivityContent.replace(
              /(public class MainActivity extends ReactActivity \{)/,
              `$1${onCreateMethod}`
            );
          }

          // Also clear in onResume to handle cases where secureTextEntry triggers it
          if (mainActivityContent.includes('protected void onResume()')) {
            if (!mainActivityContent.includes('onResume') || !mainActivityContent.match(/onResume[^}]*clearSecureFlag/)) {
              mainActivityContent = mainActivityContent.replace(
                /(protected void onResume\(\)\s*\{[^}]*super\.onResume\(\);)/,
                `$1\n    clearSecureFlag();`
              );
            }
          } else {
            // Add onResume method
            const onResumeMethod = `
  @Override
  protected void onResume() {
    super.onResume();
    clearSecureFlag();
  }`;
            
            // Insert after onCreate
            mainActivityContent = mainActivityContent.replace(
              /(protected void onCreate\([^}]*\})/,
              `$1${onResumeMethod}`
            );
          }

          // Also clear in onWindowFocusChanged for maximum coverage
          if (!mainActivityContent.includes('onWindowFocusChanged')) {
            const onWindowFocusMethod = `
  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) {
      clearSecureFlag();
    }
  }`;
            
            mainActivityContent = mainActivityContent.replace(
              /(protected void onResume\([^}]*\})/,
              `$1${onWindowFocusMethod}`
            );
          }

          fs.writeFileSync(mainActivityPath, mainActivityContent, 'utf8');
          console.log('✅ Modified MainActivity.java to allow screen recording (including login/signup screens with password fields)');
        } else {
          console.log('✅ MainActivity.java already modified for screen recording');
        }
      } else {
        console.log('⚠️  MainActivity.java not found. This plugin only works with development builds.');
        console.log('   To use this: Create a development build with: eas build --profile development --platform android');
      }

      return config;
    },
  ]);

  return config;
};

module.exports = withAllowScreenRecording;
