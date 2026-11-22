import type { AvatarId } from "../game/playerIdentity";
const coats: Record<AvatarId, [string,string]> = { fox:["#ee9a62","#fff3d9"],cat:["#bea6df","#f6e9ff"],panda:["#fff9ed","#53606a"],frog:["#8dc48b","#d7efba"],bear:["#b88867","#edd4ac"],bunny:["#eedbd3","#fff5e8"],penguin:["#5c6c85","#fff5e8"],lion:["#eac06c","#ffdf91"] };
export default function PlayerAvatar({ avatar = "fox" }: { avatar?: AvatarId }) {
  const [coat, face] = coats[avatar];
  const pointed = avatar === "fox" || avatar === "cat";
  return <svg className="animal-avatar" viewBox="0 0 80 80" role="img" aria-label={`${avatar} avatar`}>
    <circle cx="40" cy="40" r="38" fill="#f4eddf" />
    {avatar === "lion" && <circle cx="40" cy="43" r="31" fill="#bb7952" />}
    {avatar === "bunny" ? <><ellipse cx="28" cy="21" rx="9" ry="18" fill={coat} /><ellipse cx="52" cy="21" rx="9" ry="18" fill={coat} /><path d="M28 11v17m24-17v17" stroke="#e4b6b7" strokeWidth="6" strokeLinecap="round" /></> : pointed ? <path d="M16 37 15 13 35 27m10 0 20-14-1 24" fill={coat} stroke={coat} strokeWidth="4" strokeLinejoin="round" /> : <><circle cx="20" cy="26" r="10" fill={avatar === "panda" ? face : coat} /><circle cx="60" cy="26" r="10" fill={avatar === "panda" ? face : coat} /></>}
    <ellipse cx="40" cy="44" rx="27" ry="25" fill={coat} />
    <ellipse cx="40" cy="53" rx="21" ry="15" fill={avatar === "panda" ? "#fff9ed" : face} />
    {avatar === "panda" && <><ellipse cx="29" cy="40" rx="8" ry="10" fill={face} transform="rotate(20 29 40)" /><ellipse cx="51" cy="40" rx="8" ry="10" fill={face} transform="rotate(-20 51 40)" /></>}
    <g fill={avatar === "panda" ? "#fff9ed" : "#3b384e"}><circle cx="29" cy="40" r="3" /><circle cx="51" cy="40" r="3" /></g>
    {avatar === "penguin" ? <path d="m35 49 10 0-5 7z" fill="#e7ab49" /> : <path d="M36 49q4-3 8 0l-4 5z" fill="#4e4053" />}
    <path d="M34 57q6 6 12 0" fill="none" stroke="#665163" strokeWidth="2" strokeLinecap="round" />
    <g fill="#e5a5a2" opacity=".55"><ellipse cx="23" cy="51" rx="4" ry="2.5" /><ellipse cx="57" cy="51" rx="4" ry="2.5" /></g>
  </svg>;
}
