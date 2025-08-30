// Test script to verify phase detection boundary logic
// This simulates the key times around the Astronomical Dusk phase

const sunset = 19 * 60 + 30;      // 19:30 (1170 min)
const civilEnd = 20 * 60 + 0;     // 20:00 (1200 min)
const nauticalEnd = 20 * 60 + 35; // 20:35 (1235 min) 
const astroEnd = 21 * 60 + 10;    // 21:10 (1270 min)

const getPhaseAtTime = (normalizedTime) => {
  if (normalizedTime > sunset && normalizedTime <= civilEnd) {
    return 'Civil Dusk';
  } else if (normalizedTime > civilEnd && normalizedTime < nauticalEnd) {
    return 'Nautical Dusk';
  } else if (normalizedTime >= nauticalEnd && normalizedTime < astroEnd) {
    return 'Astronomical Dusk';
  } else {
    return 'Night';
  }
};

// Test key boundary times
const testTimes = [
  { time: 20*60 + 21, desc: "8:21 PM (current time)" },
  { time: 20*60 + 34, desc: "8:34 PM (1 min before nautical end)" },
  { time: 20*60 + 35, desc: "8:35 PM (exactly nautical end)" },
  { time: 20*60 + 36, desc: "8:36 PM (1 min after nautical end)" },
  { time: 21*60 + 9,  desc: "9:09 PM (1 min before astro end)" },
  { time: 21*60 + 10, desc: "9:10 PM (exactly astro end)" },
  { time: 21*60 + 11, desc: "9:11 PM (1 min after astro end)" }
];

console.log("🧪 BOUNDARY TEST RESULTS:");
console.log("========================");

testTimes.forEach(({time, desc}) => {
  const phase = getPhaseAtTime(time);
  const timeStr = `${Math.floor(time/60)}:${(time%60).toString().padStart(2,'0')}`;
  console.log(`${timeStr} (${desc}) → ${phase}`);
});

console.log("\n✅ Expected results:");
console.log("8:21 PM → Nautical Dusk");
console.log("8:34 PM → Nautical Dusk");  
console.log("8:35 PM → Astronomical Dusk");
console.log("8:36 PM → Astronomical Dusk");
console.log("9:09 PM → Astronomical Dusk");
console.log("9:10 PM → Night");
console.log("9:11 PM → Night");
