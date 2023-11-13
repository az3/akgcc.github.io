var operatorData;
function createDiagonalPattern(fillcolor) {
	//https://stackoverflow.com/questions/28569667/fill-chart-js-bar-chart-with-diagonal-stripes-or-other-patterns
	// create a 10x10 px canvas for the pattern's base shape
	let shape = document.createElement("canvas");
	shape.width = 10;
	shape.height = 10;
	// get the context for drawing
	let c = shape.getContext("2d");
	c.beginPath();
	c.rect(0, 0, 10, 10);
	c.fillStyle = fillcolor;
	c.fill();
	c.strokeStyle = "#0008";
	c.beginPath();
	c.moveTo(2, 0);
	c.lineTo(10, 8);
	c.stroke();

	c.beginPath();
	c.moveTo(0, 3);
	c.lineTo(7, 10);
	c.stroke();

	c.beginPath();
	c.moveTo(7, 0);
	c.lineTo(10, 3);
	c.stroke();

	c.beginPath();
	c.moveTo(0, 8);
	c.lineTo(2, 10);
	c.stroke();
	// create the pattern from the shape
	return c.createPattern(shape, "repeat");
}
get_char_table(false, "zh_CN")
	.then((js) => {
		operatorData = js;
		return fetch(
			"https://raw.githubusercontent.com/akgcc/cc-card-parser/master/json/banner_history.json",
		);
	})
	.then((res) => fixedJson(res))
	.then((js) => {
		const SERVERS = { EN: js.NA, CN: js.CN };
		const SERVER_STARTS = {
			EN: Date.parse("2020-01-16"),
			CN: 1556582400000,
		};
		let selectedServer = "EN";
		var shownrarities = new Set([5]);
		Object.values(SERVERS).forEach((servdata) => {
			for (const [op, data] of Object.entries(servdata)) {
				let name = htmlDecode(op);
				data.op = SHORT_NAMES[name] || name;
				data.op = GAMEPRESS_NAME_MAP[data.op] || data.op;
				data.charId = charIdMap[data.op];
				if (data.charId == undefined) delete servdata[op];
				else {
					const img = new Image();
					img.src = uri_avatar(data.charId);
					data.img = img;
					data.first = Math.min(...data.banner.map(Date.parse));
					data.shop = data.shop.map(Date.parse).sort();
				}
			}
		});

		function getDatasets(servdata) {
			let subset = Object.values(servdata).filter((x) =>
				shownrarities.has(operatorData[x.charId].rarity),
			);
			var datasets = [
				{
					data: subset,
					xValueType: "dateTime",
					backgroundColor: "#0000",
					parsing: {
						xAxisKey: "first",
						yAxisKey: "op",
					},
					stack: "1",
					categoryPercentage: 1.0,
					barPercentage: 0.6,
				},
			];
			let idx = 0;
			let cont = true;
			while (cont) {
				cont = false;
				for (const [op, data] of Object.entries(servdata)) {
					if (data.shop.length > idx) {
						cont = true;
						data[idx.toString()] =
							data.shop[idx] - (data.shop[idx - 1] || data.first);
					} else data[idx.toString()] = 0;
				}
				if (cont) {
					datasets.push({
						data: subset,
						xValueType: "dateTime",
						backgroundColor: [
							...Array(Object.values(servdata).length).keys(),
						].map((x) =>
							!idx
								? createDiagonalPattern(selectColor(x, 40, 40))
								: selectColor(x, 80),
						),
						parsing: {
							xAxisKey: idx.toString(),
							yAxisKey: "op",
						},
						stack: "1",
						categoryPercentage: 1.0,
						barPercentage: 0.6,
					});
				}
				idx++;
			}
			return datasets;
		}
		Chart.defaults.color = "#dddddd";
		Chart.defaults.font.size = 16;
		const testp = {
			id: "testp",
			afterDatasetDraw(chart, args, options) {
				const {
					ctx,
					chartArea: { top, bottom, left, right, width, height },
					scales: { x, y },
				} = chart;
				for (
					let i = 0;
					i < chart.data.datasets[args.index].data.length;
					i++
				) {
					//assumue all bars are the same size
					const imgsize = args.meta.data[0].height * 1.8;
					// position is actually the sum of the entire stack

					ctx.save();
					ctx.strokeStyle = "#999";
					// if NaN this is the "first" index
					shop_idx = parseInt(args.meta._dataset.parsing.xAxisKey);
					let first_apperance = isNaN(shop_idx);
					// if this op appears in the shop later, don't draw the first appearance bubble.
					if (
						first_apperance &&
						chart.data.datasets[args.index].data[i].shop.length
					) {
						ctx.restore();
						continue;
					}
					let x_pos = x.getPixelForValue(
						chart.data.datasets[args.index].data[i].shop[
							parseInt(args.meta._dataset.parsing.xAxisKey)
						],
					);
					if (first_apperance)
						x_pos = x.getPixelForValue(
							chart.data.datasets[args.index].data[i][
								args.meta._dataset.parsing.xAxisKey
							],
						);
					let y_pos = y.getPixelForValue(
						chart.data.datasets[args.index].data[i][
							args.meta._dataset.parsing.yAxisKey
						],
					);
					if (!x_pos || !y_pos) {
						ctx.restore();
						continue;
					}
					ctx.translate(x_pos, y_pos);
					ctx.beginPath();
					ctx.arc(
						0,
						0,
						Math.min(imgsize / 2, imgsize / 2),
						0,
						Math.PI * 2,
						false,
					);
					ctx.closePath();
					if (!first_apperance) ctx.stroke();
					ctx.clip();
					ctx.drawImage(
						chart.data.datasets[args.index].data[i].img,
						-imgsize / 2,
						-imgsize / 2,
						imgsize,
						imgsize,
					);
					if (first_apperance) {
						ctx.fillStyle = "#0008";
						ctx.fill();
					}
					ctx.restore();
				}
			},
		};
		function adjustChartHeight(size) {
			document.getElementById("barChartContainer").style.height =
				((size *
					parseFloat(getComputedStyle(document.body).fontSize) *
					5) /
					5) *
				2;
		}

		const sorters = {
			Name: (a, b) => {
				if (a.op > b.op) return 1;
				return -1;
			},
			Release: (a, b) => {
				if (a.first == b.first) {
					if (a.op > b.op) return 1;
					return -1;
				}
				if (a.first > b.first) return 1;
				return -1;
			},
			Shop: (a, b) => {
				let a_last = a.shop[a.shop.length - 1];
				let b_last = b.shop[b.shop.length - 1];
				if (a_last == b_last) {
					if (a.first > b.first) return 1;
					return -1;
				}
				if (!a_last) return 1;
				if (!b_last) return -1;
				if (a_last > b_last) return 1;
				return -1;
			},
		};
		var labelSort = sorters.Shop;
		//////////////////////////////////////////////////
		// this is just the contents of redrawCharts()
		let subset = Object.values(SERVERS[selectedServer]).filter((x) =>
			shownrarities.has(operatorData[x.charId].rarity),
		);
		var labels = subset.sort(labelSort).map((x) => x.op);
		var datasets = getDatasets(SERVERS[selectedServer]);
		for (i = 0; i < datasets.length; i++)
			// remove elements not in labels
			datasets[i].data = subset;
		adjustChartHeight(subset.length);
		//////////////////////////////////////////////////
		let barGraph = new Chart(document.getElementById("opChart"), {
			type: "bar",
			data: {
				labels: labels,
				datasets: datasets,
			},
			plugins: [testp],
			options: {
				events: [],
				animation: {
					duration: 0,
				},
				layout: {
					padding: {
						right: 30,
					},
				},
				indexAxis: "y",
				interaction: {
					// mode: "index",
				},

				plugins: {
					legend: {
						display: false,
					},
					tooltip: {
						enabled: false,
					},
				},
				maintainAspectRatio: false,
				responsive: true,

				scales: {
					x: {
						type: "time",
						time: {
							unit: "month",
						},
						min: SERVER_STARTS[selectedServer],
						max: Date.now(),
						grid: {
							// display: false,
							color: "#777",
							// borderColor: "#aaa",
						},
					},
					x1: {
						position: "top",
						type: "time",
						time: {
							unit: "month",
						},
						min: SERVER_STARTS[selectedServer],
						max: Date.now(),
					},
					y: {
						ticks: {
							padding: 20,
						},
					},
				},
			},
		});
		Promise.all(
			Object.values(SERVERS[selectedServer]).map((x) => {
				return new Promise((resolve, reject) => {
					x.img.onload = resolve;
					x.img.onerror = reject;
				});
			}),
		).then((p) => {
			barGraph.update();
		});

		const btns = document.createElement("div");
		btns.id = "barSort";
		btns.classList.add("sortdiv");
		document.getElementById("sortSelect").appendChild(btns);
		label = document.createElement("label");
		label.innerHTML = "Sort By:";
		btns.appendChild(label);

		for (const [n, sorter] of Object.entries(sorters)) {
			btn = document.createElement("div");
			btn.classList = "sorter button";
			if (n == "Shop") btn.classList.add("checked");
			btn.setAttribute("data-name", n);
			btn.innerHTML = n;
			btns.appendChild(btn);
			btn.onclick = (e) => {
				labelSort = sorter;
				Array.from(btns.childNodes).forEach((x) =>
					x.classList.remove("checked"),
				);
				e.currentTarget.classList.toggle("checked");
				redrawCharts();
			};
		}

		const raritybtns = document.createElement("div");
		raritybtns.id = "barRarities";
		raritybtns.classList.add("sortdiv");
		document.getElementById("raritySelect").appendChild(raritybtns);
		label = document.createElement("label");
		label.innerHTML = "Show:";
		raritybtns.appendChild(label);
		for (const i of [3, 4, 5]) {
			btn = document.createElement("div");
			btn.classList = "sorter button";
			if (i == 5) btn.classList.add("checked");
			btn.setAttribute("data-name", 1 + i + "*");
			btn.innerHTML = 1 + i + "*";
			raritybtns.appendChild(btn);
			btn.onclick = (e) => {
				e.currentTarget.classList.toggle("checked");
				if (e.currentTarget.classList.contains("checked"))
					shownrarities.add(i);
				else shownrarities.delete(i);
				redrawCharts();
			};
		}

		const serverbtns = document.createElement("div");
		serverbtns.id = "barServers";
		serverbtns.classList.add("sortdiv");
		document.getElementById("localServerSelect").appendChild(serverbtns);
		label = document.createElement("label");
		label.innerHTML = "Server:";
		serverbtns.appendChild(label);
		Object.keys(SERVERS).forEach((s) => {
			btn = document.createElement("div");
			btn.classList = "sorter button";
			if (s == "EN") btn.classList.add("checked");
			btn.setAttribute("data-name", s);
			btn.innerHTML = s;
			serverbtns.appendChild(btn);
			btn.onclick = (e) => {
				Array.from(serverbtns.childNodes).forEach((x) =>
					x.classList.remove("checked"),
				);
				e.currentTarget.classList.toggle("checked");
				selectedServer = s;
				barGraph.data.datasets = getDatasets(SERVERS[selectedServer]);
				barGraph.options.scales.x.min = SERVER_STARTS[selectedServer];
				barGraph.options.scales.x1.min = SERVER_STARTS[selectedServer];

				redrawCharts();
			};
		});
		function redrawCharts() {
			let subset = Object.values(SERVERS[selectedServer]).filter((x) =>
				shownrarities.has(operatorData[x.charId].rarity),
			);
			barGraph.data.labels = subset.sort(labelSort).map((x) => x.op);

			for (i = 0; i < barGraph.data.datasets.length; i++)
				// remove elements not in labels
				barGraph.data.datasets[i].data = subset;
			adjustChartHeight(subset.length);

			barGraph.update();
		}
	});
