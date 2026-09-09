type SocialLogoProps = {
  iconKey?: string | null;
  iconUrl?: string | null;
  className?: string;
};

export default function SocialLogo({
  iconKey,
  iconUrl,
  className = "h-5 w-5",
}: SocialLogoProps) {
  const key = iconKey === "twitter" ? "x" : iconKey;

  if (key === "linkedin") {
    return (
      <svg
        viewBox="0 0 24 24"
        role="img"
        aria-label="LinkedIn"
        className={className}
        fill="#0A66C2"
      >
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.99h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.1 20.45H3.54V8.99H7.1v11.46Z" />
      </svg>
    );
  }

  if (key === "x") {
    return (
      <svg
        viewBox="0 0 24 24"
        role="img"
        aria-label="X"
        className={className}
        fill="currentColor"
      >
        <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.59l5.25 6.93 6.06-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
      </svg>
    );
  }

  return iconUrl ? (
    <img
      src={iconUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className={className}
    />
  ) : (
    <span aria-hidden="true" className={className} />
  );
}
