import { SAREES_RAW } from "./sarees-raw";

export const DEFAULT_BRAND = "Janardhan Textile";

export const COLOR_HEX: Record<string, string> = {
  Magenta: "#a3175f", "Cobalt Blue": "#1f3fae", Coral: "#e9735f", Lavender: "#b6a1d8",
  "Sandal Beige": "#d8bf98", "Candy Pink": "#f19ac0", "Mustard Yellow": "#d1a018",
  "Midnight Blue": "#1b2450", Ivory: "#f3ecd9", Teal: "#127a78", "Wine Red": "#6e1626",
  "Mulberry Purple": "#5c1f4f", "Charcoal Grey": "#3b3b3f", "Olive Green": "#6b6b2a",
  "Beet Pink": "#b0285c", "Mint Green": "#9fd8bd", "Rust Orange": "#b3501f",
  "Peacock Blue": "#0d6b8c", "Emerald Green": "#167a4a", Maroon: "#6b1420",
};

const PHOTOS = import.meta.glob("@/assets/sarees/*.jpg", { eager: true, import: "default" }) as Record<string, string>;
const photoFor = (id: number) => Object.entries(PHOTOS).find(([k]) => k.endsWith(`/${id}.jpg`))?.[1];

const TEXTURE: Record<string, string> = {
  "Soft Silk": "smooth, lustrous soft silk", "Linen Cotton": "breathable linen-cotton weave",
  "Kota Silk": "airy chequered Kota weave", "Tussar Silk": "rich, earthy Tussar texture",
  "Banarasi Silk": "smooth zari-finished Banarasi silk", "Mysore Silk": "featherlight pure Mysore silk",
  "Chanderi Cotton": "sheer, glossy Chanderi weave", "Organza Silk": "lightweight sheer organza",
  "Mangalgiri Cotton": "crisp handloom Mangalgiri cotton", "Gadwal Silk Cotton": "cotton body with silk-borders",
  "Khadi Cotton": "hand-spun, breathable khadi", "Jute Silk": "textured jute-silk blend",
  "Paper Silk": "crisp, lightweight paper silk", "Mul Cotton": "ultra-soft mul cotton",
  "Sungudi Cotton": "tie-dyed Madurai Sungudi cotton", "Kanjivaram Silk": "heavy, temple-woven Kanjivaram silk",
};

const BASE_PRICE: Record<string, number> = {
  "Kanjivaram Silk": 8999, "Banarasi Silk": 6499, "Mysore Silk": 5999, "Tussar Silk": 4499,
  "Organza Silk": 3299, "Soft Silk": 2799, "Gadwal Silk Cotton": 2999, "Kota Silk": 1999,
  "Jute Silk": 1899, "Paper Silk": 1699, "Chanderi Cotton": 1799, "Linen Cotton": 1599,
  "Mangalgiri Cotton": 1399, "Sungudi Cotton": 1199, "Khadi Cotton": 1299, "Mul Cotton": 999,
};

export type Saree = {
  id: number; style: string; fabric: string; color: string; pattern: string; occasion: string;
  title: string; price: number; hex: string; photo?: string | undefined; texture: string;
};

export const SAREES: Saree[] = SAREES_RAW.map((r) => ({
  ...r,
  title: `${r.color} - ${r.style} - ${r.fabric} Saree with ${r.pattern}`,
  price: (BASE_PRICE[r.fabric] ?? 1499) + (r.id % 5) * 100,
  hex: COLOR_HEX[r.color] ?? "#888",
  photo: photoFor(r.id),
  texture: TEXTURE[r.fabric] ?? "fine handloom weave",
}));

export const FABRICS = [...new Set(SAREES.map((s) => s.fabric))];
export const OCCASIONS = [...new Set(SAREES.map((s) => s.occasion))];

export const listingText = (s: Saree) =>
  `${s.color} - ${s.style} - ${s.fabric} Saree with ${s.pattern} - Perfect for ${s.occasion}

This ${s.fabric.toLowerCase()} saree is crafted for effortless elegance. The ${s.texture} drapes beautifully and is comfortable for long hours of wear. Finished with ${s.pattern.toLowerCase()} and a contrast pallu, it's an ideal choice for ${s.occasion.toLowerCase()}.

Saree Fabric: ${s.fabric}
Saree Length: 6.2 mtr saree with blouse
Blouse: Unstitched, matching contrast

Price: Rs. ${s.price}`;

export const imagePrompt = (s: Saree) =>
  `Professional e-commerce product photography of an Indian ${s.fabric} saree in ${s.color}, featuring ${s.pattern}, draped on an Indian female model standing against a plain studio backdrop (soft grey or beige). Front-facing full-body shot, pallu draped over the left shoulder, matching blouse, natural daylight-style softbox lighting, sharp focus on fabric texture and border detail, minimal shadows, shot on 85mm lens, commercial fashion catalog style, --ar 3:4 --v 6`;

export const flatLayPrompt = (s: Saree) =>
  `Flat-lay product photography of a folded ${s.fabric} saree in ${s.color} with ${s.pattern}, pallu unfolded to show the border detail, shot from directly above on a plain white surface, soft even studio lighting, high resolution, e-commerce catalog style, --ar 1:1 --v 6`;

export const videoPrompt = (a: Saree, b: Saree, brand: string) =>
  `A graceful Indian woman stands in a softly lit studio with a warm beige backdrop, wearing a ${a.color} ${a.fabric} saree with ${a.pattern}, styled with ${a.occasion} jewellery. She does a quick turn and flicks the pallu over her shoulder — on the beat of the turn, the saree instantly transitions to a ${b.color} ${b.fabric} saree with ${b.pattern}. Smooth cinematic motion, soft diffused lighting, shallow depth of field, 4K, vertical 9:16, fabric drape physics realistic, steady camera, subtle background bokeh, brand watermark "${brand}" fades in bottom-right for 1 second after each transition.`;

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
