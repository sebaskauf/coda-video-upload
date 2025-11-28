const PlatformIcon = ({ platform, size = 24 }) => {
  const style = { width: size, height: size }

  switch (platform?.toLowerCase()) {
    case 'instagram':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFDC80" />
              <stop offset="25%" stopColor="#FCAF45" />
              <stop offset="50%" stopColor="#F77737" />
              <stop offset="75%" stopColor="#F56040" />
              <stop offset="100%" stopColor="#FD1D1D" />
            </linearGradient>
            <linearGradient id="instagram-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#833AB4" />
              <stop offset="50%" stopColor="#C13584" />
              <stop offset="100%" stopColor="#E1306C" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient)" />
          <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient-2)" fillOpacity="0.5" />
          <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
        </svg>
      )

    case 'tiktok':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#000000" />
          <path d="M16.5 8.5C15.5 8.5 14.5 8 14 7V14C14 16.2 12.2 18 10 18C7.8 18 6 16.2 6 14C6 11.8 7.8 10 10 10" stroke="#25F4EE" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M16.5 8.5C15.5 8.5 14.5 8 14 7V14C14 16.2 12.2 18 10 18C7.8 18 6 16.2 6 14C6 11.8 7.8 10 10 10" stroke="#FE2C55" strokeWidth="2" strokeLinecap="round" fill="none" transform="translate(0.5, -0.5)" />
          <path d="M14 7V14C14 16.2 12.2 18 10 18C7.8 18 6 16.2 6 14C6 11.8 7.8 10 10 10" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M14 7C14.5 8 15.5 8.5 16.5 8.5V11C15.3 11 14.3 10.5 13.5 9.8" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      )

    case 'youtube':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#FF0000" />
          <path d="M10 15.5V8.5L16 12L10 15.5Z" fill="white" />
        </svg>
      )

    case 'facebook':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#1877F2" />
          <path d="M15.5 12H13.5V18H10.5V12H9V9.5H10.5V8C10.5 6.34 11.84 5 13.5 5H15.5V7.5H14C13.45 7.5 13 7.95 13 8.5V9.5H15.5L15 12H13.5" fill="white" />
        </svg>
      )

    case 'linkedin':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#0A66C2" />
          <path d="M8 10V17M8 7V7.01M11 17V13C11 11.5 12 10.5 13.5 10.5C15 10.5 15.5 11.5 15.5 13V17M11 10V17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )

    default:
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#666666" />
          <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="2" fill="none" />
          <path d="M6 18C6 15 9 14 12 14C15 14 18 15 18 18" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      )
  }
}

export default PlatformIcon
