/**
 * Modular Session Widget (Main Export)
 * This is the main export that maintains backward compatibility
 * while using the new modular architecture
 */

import SessionWidget from './SessionWidget/index';
import SessionWidgetEnhanced from './SessionWidget/Enhanced';

// Default export for backward compatibility
export default SessionWidget;

// Named export for enhanced version
export { SessionWidgetEnhanced };
