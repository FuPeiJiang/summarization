const fs = require('fs');
const pdf = require('pdf-parse');
const axios = require('axios');
const querystring = require('querystring');

const api_url = "http://localhost:5000/api"

// turn arr into 'chunks' of chunkSize
function chunk(arr, chunkSize) {
	var res = [];
	for (var i = 0, len = arr.length; i < len; i += chunkSize)
		res.push(arr.slice(i, i + chunkSize));
	return res;
}

async function parse(name) {
	let dataBuffer = fs.readFileSync(`./dataset/${name}.pdf`);
	const MAX_TOK_SIZE = 512
	const data = await pdf(dataBuffer)

	cleanedText = data.text.replace(/(\r\n|\n|\r)/gm, "")
	tokens = cleanedText.split(" ")
	chunks = chunk(tokens, Math.round(MAX_TOK_SIZE)).map(c => c.join(" "))

	// post to api
	console.log(`sending ${chunks.length} requests to back end for inference...`)
	const res = []

	for (var i = 0; i < chunks.length; i++) {
		const r = await axios.post(api_url + "/summarize", querystring.stringify({ text: chunks[i] }))

		if (r.data) {
			const t = r.data.summary
			console.log(`[${i}] -> ${t}`)
			res.push(t)
		}
	}

	const full = res.join(" ")
	const r = await axios.post(api_url + "/ner", querystring.stringify({ text: full }))

	const retData = JSON.stringify({
		named_entities: r.data,
		summary: full,
	})

	fs.writeFile(`./results/${name}.json`, retData, (err) => {
		if (err) {
			console.log(err);
		}
	});
}

exports.parse = parse