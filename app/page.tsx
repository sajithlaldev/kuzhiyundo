import MapLoader from "@/components/MapLoader";

export default function Home() {
  return (
    <main>
      {/* Full-screen interactive map */}
      <div className="h-screen w-screen">
        <MapLoader />
      </div>

      {/* Server-rendered content for SEO — visible on scroll */}
      <section className="bg-black text-white font-mono px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-cyan-400 mb-4">
          Kuzhiyundo — Community Pothole Tracker for Kerala
        </h1>
        <p className="text-cyan-300/80 text-sm leading-relaxed mb-8">
          Kuzhiyundo (കുഴിയുണ്ടോ — "Is there a pothole?") is a free, community-driven map
          where residents of Kerala can report, track, and vote on road potholes in their
          area. Reports include road segment, severity, photo evidence, and the responsible
          authority — from Ward Members to NHAI.
        </p>

        <h2 className="text-lg font-bold text-cyan-400 mb-3">How it works</h2>
        <ol className="text-cyan-300/70 text-sm space-y-2 mb-8 list-decimal list-inside">
          <li>Tap two points on the map to trace a pothole road segment</li>
          <li>Set severity (low / medium / high) and optionally add a photo and notes</li>
          <li>The system automatically resolves your Assembly, Parliamentary, and LSGD constituency</li>
          <li>Road authority is classified from OpenStreetMap data (Ward → Panchayat → PWD → NHAI)</li>
          <li>Community members upvote or dispute reports to surface the worst roads</li>
        </ol>

        <h2 className="text-lg font-bold text-cyan-400 mb-3">Districts covered</h2>
        <ul className="text-cyan-300/70 text-sm grid grid-cols-2 gap-1 mb-8">
          {[
            "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
            "Kottayam", "Idukki", "Ernakulam", "Thrissur",
            "Palakkad", "Malappuram", "Kozhikode", "Wayanad",
            "Kannur", "Kasaragod",
          ].map((d) => (
            <li key={d} className="before:content-['▸'] before:text-cyan-500 before:mr-1">{d}</li>
          ))}
        </ul>

        <h2 className="text-lg font-bold text-cyan-400 mb-3">Road authority classification</h2>
        <ul className="text-cyan-300/70 text-sm space-y-1 mb-8">
          <li><span className="text-yellow-400 font-bold">National Highway / NHAI</span> — Motorway, trunk roads → MP / NHAI</li>
          <li><span className="text-orange-400 font-bold">State PWD</span> — Primary, secondary roads → MLA / State PWD</li>
          <li><span className="text-green-400 font-bold">Panchayat / LSGD</span> — Tertiary roads → Local body</li>
          <li><span className="text-cyan-400 font-bold">Ward Member</span> — Residential and unclassified roads</li>
        </ul>

        <h2 className="text-lg font-bold text-cyan-400 mb-3">Report a pothole in Kerala</h2>
        <p className="text-cyan-300/70 text-sm leading-relaxed">
          Anyone can report a pothole on kuzhiyundo.com. Sign in with Google, trace the damaged
          road on the map, and submit. Your report is instantly visible to the community and
          tagged to the correct government authority responsible for the road. Kerala residents
          can use this data to hold local bodies, PWD, and NHAI accountable for road maintenance.
        </p>
      </section>
    </main>
  );
}
