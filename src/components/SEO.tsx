import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://matchupfight.lovable.app";
const SITE_NAME = "MatchUp";

interface SEOProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  ogType?: string;
  image?: string;
  jsonLd?: object | object[];
}

export function SEO({ title, description, canonicalPath, ogType = "website", image, jsonLd }: SEOProps) {
  const { pathname } = useLocation();
  const path = canonicalPath ?? pathname;
  const url = `${SITE_URL}${path}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const trimmedTitle = fullTitle.length > 60 ? fullTitle.slice(0, 57) + "..." : fullTitle;
  const desc = description?.slice(0, 160);
  const jsonBlocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{trimmedTitle}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={trimmedTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta name="twitter:title" content={trimmedTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta name="twitter:image" content={image} />}
      {jsonBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(block)}</script>
      ))}
    </Helmet>
  );
}
