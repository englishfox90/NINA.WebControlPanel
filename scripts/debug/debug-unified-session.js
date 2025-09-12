// Debug script to check UnifiedSessionManager status
const { configDatabase } = require('./src/server/configDatabase');
const { ninaService } = require('./src/services/ninaService');
const UnifiedSessionManager = require('./src/server/session/UnifiedSessionManager');

async function debugUnifiedSessionManager() {
  try {
    console.log('🔍 Initializing debug session...');
    
    // Create UnifiedSessionManager
    const configDb = configDatabase();
    const nina = ninaService();
    
    console.log('📊 Config Database:', !!configDb ? 'OK' : 'FAILED');
    console.log('🌌 NINA Service:', !!nina ? 'OK' : 'FAILED');
    
    const unifiedManager = new UnifiedSessionManager(configDb, nina);
    
    console.log('🎯 UnifiedSessionManager created, initializing...');
    
    // Listen for events before initializing
    unifiedManager.on('sessionUpdate', (sessionData) => {
      console.log('📸 Session update received:', {
        isActive: sessionData.isActive,
        hasLastImage: !!sessionData.lastImage,
        lastImageType: sessionData.lastImage?.type,
        lastImageTimestamp: sessionData.lastImage?.timestamp
      });
    });
    
    unifiedManager.on('ninaEvent', (eventType, eventData) => {
      console.log('📡 NINA event received:', eventType);
      if (eventType === 'IMAGE-SAVE') {
        console.log('🖼️ IMAGE-SAVE event details:', {
          hasImageStatistics: !!eventData.ImageStatistics,
          filter: eventData.ImageStatistics?.Filter
        });
      }
    });
    
    // Initialize
    await unifiedManager.initialize();
    console.log('✅ UnifiedSessionManager initialized successfully');
    
    // Get current session data
    const currentSession = unifiedManager.getCurrentSessionData();
    console.log('📊 Current session data:', {
      isActive: currentSession.isActive,
      hasLastImage: !!currentSession.lastImage,
      lastImageType: currentSession.lastImage?.type,
      lastImageFilter: currentSession.lastImage?.filter,
      lastImageTimestamp: currentSession.lastImage?.timestamp
    });
    
    console.log('🎧 Listening for live events for 60 seconds...');
    
    setTimeout(() => {
      console.log('⏰ Debug session complete');
      unifiedManager.destroy();
      process.exit(0);
    }, 60000);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

debugUnifiedSessionManager();
