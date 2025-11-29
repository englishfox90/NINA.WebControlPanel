# Fresh Installation Guide for New Users

## Quick Start - Clean Installation

Your NINA WebControlPanel is now configured with a **fresh database** ready for first-time setup.

### What Was Done

✅ **Previous database backed up** to: `src/server/dashboard-config.sqlite.backup-[timestamp]`  
✅ **Fresh database created** with default configuration  
✅ **Ready for your custom setup**

### First-Time Setup Steps

1. **Start the application:**
   ```bash
   npm start
   ```

2. **Access the dashboard:**
   - Open your browser to: http://localhost:3000
   - Backend API runs on: http://localhost:3001

3. **Configure NINA Connection:**
   - Click the Settings icon (⚙️) in the dashboard
   - Enter your NINA server details:
     - **Host/IP**: Your NINA machine IP (e.g., `192.168.1.100` or `localhost`)
     - **Port**: Default is `1888`
   - Click Save

4. **Optional: Configure Target Scheduler Database**
   - In Settings, locate "SQLite Database" section
   - Click "Choose Database" to select your NINA `schedulerdb.sqlite` file
   - Or manually copy it to: `resources/schedulerdb.sqlite`

5. **Configure RTSP Streams (Optional):**
   - Add up to 3 camera stream URLs in Settings
   - Example: `rtsp://camera-ip:554/stream`

### Default Configuration

The fresh database includes:
- ✅ Default widget layout
- ✅ Standard system monitoring settings
- ✅ Placeholder NINA connection (needs your configuration)
- ✅ Empty stream URLs (ready for your cameras)

### Configuration Locations

| Setting | Location | Default |
|---------|----------|---------|
| **Dashboard Config** | `src/server/dashboard-config.sqlite` | Auto-created |
| **Target Scheduler** | Configure in Settings or `resources/schedulerdb.sqlite` | Optional |
| **NINA API** | Configure in Settings | `http://localhost:1888` |
| **Streams** | Configure in Settings | Empty (add yours) |

### Restore Previous Configuration

If you need to restore your previous settings:

```bash
# Stop the server first (Ctrl+C)

# Restore from backup
Copy-Item src\server\dashboard-config.sqlite.backup-[timestamp] src\server\dashboard-config.sqlite

# Restart the server
npm start
```

### Reset Database Again

To reset the database again in the future:

```bash
# Option 1: Use the npm script (with confirmation prompt)
npm run reset-db

# Option 2: Manual reset
Remove-Item src\server\dashboard-config.sqlite
# Database will be recreated on next startup
```

### Troubleshooting

#### Server Won't Start
- Check that port 3001 is not in use
- Verify Node.js 18+ is installed: `node --version`
- Check for errors in console output

#### Can't Connect to NINA
- Ensure NINA is running
- Enable NINA Advanced API: Tools → Options → API → Enable HTTP Server
- Check firewall allows port 1888
- Verify IP address is correct

#### Target Scheduler Shows "Unavailable"
- This is normal if you haven't configured the database yet
- Copy your NINA `schedulerdb.sqlite` to `resources/schedulerdb.sqlite`
- Or use the Settings modal to select the database file

#### Fresh Database Not Created
- Check file permissions in `src/server/` directory
- Ensure no antivirus blocking SQLite database creation
- Check console for error messages

### Need Help?

- 📖 Full documentation: `docs/README.md`
- 🐛 Report issues: https://github.com/englishfox90/NINA.WebControlPanel/issues
- 💬 Configuration guide: `docs/CONFIGURATION.md`

---

**Welcome to NINA WebControlPanel!** 🔭✨

Your fresh installation is ready to be customized for your observatory setup.
