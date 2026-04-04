const NetworkBackground = () => (
  <div style={{
    position: 'absolute', inset: 0,
    background: '#0d1929',
    overflow: 'hidden'
  }}>
    <svg width="100%" height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <pattern id="network-bg"
          x="0" y="0"
          width="200" height="200"
          patternUnits="userSpaceOnUse">
          <line x1="20" y1="30" x2="80" y2="60" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
          <line x1="80" y1="60" x2="140" y2="20" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
          <line x1="140" y1="20" x2="180" y2="80" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
          <line x1="80" y1="60" x2="100" y2="140" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
          <line x1="100" y1="140" x2="160" y2="170" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
          <line x1="20" y1="30" x2="100" y2="140" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <line x1="40" y1="120" x2="80" y2="60" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <line x1="60" y1="180" x2="100" y2="140" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <line x1="160" y1="170" x2="180" y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <circle cx="20" cy="30" r="2" fill="rgba(255,255,255,0.2)"/>
          <circle cx="80" cy="60" r="2.5" fill="rgba(255,255,255,0.25)"/>
          <circle cx="140" cy="20" r="2" fill="rgba(255,255,255,0.18)"/>
          <circle cx="180" cy="80" r="1.5" fill="rgba(255,255,255,0.15)"/>
          <circle cx="100" cy="140" r="2" fill="rgba(255,255,255,0.2)"/>
          <circle cx="160" cy="170" r="2.5" fill="rgba(255,255,255,0.22)"/>
          <circle cx="40" cy="120" r="1.5" fill="rgba(255,255,255,0.12)"/>
          <circle cx="60" cy="180" r="2" fill="rgba(255,255,255,0.15)"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#network-bg)"/>
    </svg>
  </div>
);

export default NetworkBackground;
