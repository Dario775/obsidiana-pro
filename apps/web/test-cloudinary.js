const cloudName = "docwuytkh";
const apiKey = "281286337557641";
const apiSecret = "cncJtI12yXBQb2nlT_afoKqR64o";

async function run() {
  try {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      },
      body: JSON.stringify({
        expression: "folder:obsidiana/* AND 7790895067488",
        max_results: 10
      })
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Assets count:", data.resources?.length || 0);
    console.log("Assets:", JSON.stringify(data.resources, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
