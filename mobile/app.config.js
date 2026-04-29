/**
 * Dynamic Expo config — wraps app.json so we can inject the Firebase
 * google-services.json path from an EAS file environment variable
 * (GOOGLE_SERVICES_JSON, secret-visibility) at build time. This keeps the
 * sensitive Firebase config out of git while still reaching the EAS builder.
 *
 * Local development falls back to ./google-services.json (gitignored).
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
