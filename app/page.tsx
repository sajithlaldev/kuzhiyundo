import MapLoader from "@/components/MapLoader";

export default function Home() {
  return (
    <main>
      {/* Full-screen interactive map */}
      <div className="h-screen w-screen">
        <MapLoader />
      </div>

      {/* Server-rendered content for SEO — visible on scroll */}
      <section id="seo-content" className="bg-white dark:bg-black text-black dark:text-white font-mono px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-cyan-400 mb-4">
          Kuzhiyundo — Community Pothole Tracker for Kerala
        </h1>
        <p className="text-blue-800/80 dark:text-cyan-300/80 text-sm leading-relaxed mb-8">
          Kuzhiyundo (കുഴിയുണ്ടോ — "Is there a pothole?") is a free, community-driven map
          where residents of Kerala can report, track, and vote on road potholes in their
          area. Reports include road segment, severity, photo evidence, and the responsible
          authority — from Ward Members to NHAI.
        </p>

        <h2 className="text-lg font-bold text-blue-700 dark:text-cyan-400 mb-3">How it works</h2>
        <ol className="text-blue-800/80 dark:text-cyan-300/70 text-sm space-y-2 mb-8 list-decimal list-inside">
          <li>Tap two points on the map to trace a pothole road segment</li>
          <li>Set severity (low / medium / high) and optionally add a photo and notes</li>
          <li>The system automatically resolves your Assembly, Parliamentary, and LSGD constituency</li>
          <li>Road authority is classified from OpenStreetMap data (Ward → Panchayat → PWD → NHAI)</li>
          <li>Community members upvote or dispute reports to surface the worst roads</li>
        </ol>

        <h2 className="text-lg font-bold text-blue-700 dark:text-cyan-400 mb-3">Districts covered</h2>
        <ul className="text-blue-800/80 dark:text-cyan-300/70 text-sm grid grid-cols-2 gap-1 mb-8">
          {[
            "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
            "Kottayam", "Idukki", "Ernakulam", "Thrissur",
            "Palakkad", "Malappuram", "Kozhikode", "Wayanad",
            "Kannur", "Kasaragod",
          ].map((d) => (
            <li key={d} className="before:content-['▸'] before:text-blue-500 dark:before:text-cyan-500 before:mr-1">{d}</li>
          ))}
        </ul>

        <h2 className="text-lg font-bold text-blue-700 dark:text-cyan-400 mb-3">Road authority classification</h2>
        <ul className="text-blue-800/80 dark:text-cyan-300/70 text-sm space-y-1 mb-8">
          <li><span className="text-yellow-400 font-bold">National Highway / NHAI</span> — Motorway, trunk roads → MP / NHAI</li>
          <li><span className="text-orange-400 font-bold">State PWD</span> — Primary, secondary roads → MLA / State PWD</li>
          <li><span className="text-green-400 font-bold">Panchayat / LSGD</span> — Tertiary roads → Local body</li>
          <li><span className="text-blue-600 dark:text-cyan-400 font-bold">Ward Member</span> — Residential and unclassified roads</li>
        </ul>

        <h2 className="text-lg font-bold text-blue-700 dark:text-cyan-400 mb-3">Report a pothole in Kerala</h2>
        <p className="text-blue-800/80 dark:text-cyan-300/70 text-sm leading-relaxed">
          Anyone can report a pothole on kuzhiyundo.com. Sign in with Google, trace the damaged
          road on the map, and submit. Your report is instantly visible to the community and
          tagged to the correct government authority responsible for the road. Kerala residents
          can use this data to hold local bodies, PWD, and NHAI accountable for road maintenance.
        </p>

        <h2 className="text-lg font-bold text-cyan-400 mt-12 mb-6">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-6">

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">Do I need to create an account?</h3>
            <p className="text-cyan-300/60 text-sm leading-relaxed">
              No. You can report anonymously by uploading a geotagged photo — no account needed.
              If you sign in with Google, you can draw a road segment on the map, edit or delete your
              own reports, and your name is linked to the report.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">What is a geotagged photo?</h3>
            <p className="text-cyan-300/60 text-sm leading-relaxed">
              A geotagged photo has GPS coordinates embedded in its metadata (EXIF data). Most
              smartphones automatically add this when you take a photo — as long as the Camera app
              has location permission. The location is read entirely on your device; the photo is
              compressed and stored as part of your report.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-2">How do I enable geotagging on my phone?</h3>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-400/60 mb-1.5">iPhone / iPad (iOS)</p>
                <ol className="text-cyan-300/60 text-sm space-y-1 list-decimal list-inside mb-2">
                  <li>Open <strong className="text-cyan-300/80">Settings</strong> → <strong className="text-cyan-300/80">Privacy &amp; Security</strong> → <strong className="text-cyan-300/80">Location Services</strong></li>
                  <li>Find <strong className="text-cyan-300/80">Camera</strong> in the list</li>
                  <li>Set it to <strong className="text-cyan-300/80">&ldquo;While Using the App&rdquo;</strong></li>
                  <li>Re-open the Camera app and take a new photo</li>
                </ol>
                <a
                  href="https://www.youtube.com/watch?v=Vfq1eZP7r7g"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                  Watch iOS tutorial on YouTube
                </a>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-400/60 mb-1.5">Android</p>
                <ol className="text-cyan-300/60 text-sm space-y-1 list-decimal list-inside mb-2">
                  <li>Open the <strong className="text-cyan-300/80">Camera</strong> app</li>
                  <li>Tap the <strong className="text-cyan-300/80">Settings icon</strong> (gear or three lines)</li>
                  <li>Find <strong className="text-cyan-300/80">&ldquo;Location tags&rdquo;</strong>, <strong className="text-cyan-300/80">&ldquo;GPS tag&rdquo;</strong>, or <strong className="text-cyan-300/80">&ldquo;Save location&rdquo;</strong> → turn it <strong className="text-cyan-300/80">On</strong></li>
                  <li>Allow the Camera app to access your location if prompted</li>
                  <li>Take a new photo and upload it</li>
                </ol>
                <a
                  href="https://www.youtube.com/watch?v=r6eEVL9XgXU"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                  Watch Android tutorial on YouTube
                </a>
              </div>
              <p className="text-[11px] text-cyan-300/40 leading-relaxed">
                Important: do not screenshot or re-save the photo before uploading — this strips the GPS data.
                Upload the original file directly from your camera roll.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">What happens after I report?</h3>
            <p className="text-cyan-300/60 text-sm leading-relaxed">
              Your report is instantly visible on the map for the whole community. Other users can
              upvote it to signal severity, or dispute it if inaccurate. The report is tagged to the
              responsible authority — Ward Member, Panchayat/LSGD, State PWD, or NHAI/MP — so it
              can be used as evidence when contacting them.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">Who fixes the pothole?</h3>
            <p className="text-cyan-300/60 text-sm leading-relaxed">
              Responsibility depends on the road type. Residential and unclassified roads fall under
              the Ward Member. Tertiary roads are maintained by the Panchayat or LSGD. State and
              primary roads are the responsibility of the State PWD and MLA. National Highways are
              maintained by NHAI. Kuzhiyundo identifies this automatically from OpenStreetMap data.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">Is my data private?</h3>
            <p className="text-cyan-300/60 text-sm leading-relaxed">
              For Google sign-in users, only your display name is stored and shown on the report.
              For anonymous reports, only the name you enter (or &ldquo;Anonymous&rdquo;) is stored — no email
              or account details. GPS coordinates come only from the photo you upload; your current
              device location is never requested.
            </p>
          </div>

        </div>
      </section>
    </main>
  );
}
