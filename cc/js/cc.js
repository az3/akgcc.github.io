const lightbox = GLightbox({
	selector: '.glightbox',
	touchNavigation: true,
	loop: true,
	closeOnOutsideClick: true
});
if (!window.location.hash)
	window.location.hash = '#4'


document.getElementById('usageLink').href = './cc-usage.html' + window.location.hash
var charIdMap = {}
var cardOperatorMap = {}
var filterStatus = {}
var totalChecked = 0
var cardData
var headersMap = {}
var headerCount = {}
var riskMap = {}
var filterSortType = true
var invertFilter = false
var includesAll = true
var weekFilter = 7
var maxOpCount = 13
var maxAvgRarity = 6
var lightboxElements
var lightboxDateOrder = {}
var lightboxMapping
var lightboxSoulOrder = {}
var CCTAG
fetch('./cctitles.json')
.then(res => res.json())
.then(json => {
CCMAP = json; 
CCTAG = CCMAP[window.location.hash].tag
document.getElementById('pageTitle').innerHTML = CCMAP[window.location.hash].title
return fetch('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/en_US/gamedata/excel/character_table.json')})
	.then(res => res.json())
	.then(js => {
		operatorData = js;
		return fetch('./data' + CCTAG + '.json')
	})
	.then(res => res.json())
	.then(js => {
		cardData = js
		// filter out duplicates, keep max 1 per group (day1,week1,week2)
		dupe_groups = {}
		Object.keys(cardData).forEach(x => {
			if (cardData[x].duplicate_of) {
				dupe_groups[cardData[x].duplicate_of] = dupe_groups[cardData[x].duplicate_of] || {}
				dupe_groups[cardData[x].duplicate_of][cardData[x].group] = (dupe_groups[cardData[x].duplicate_of][cardData[x].group] || []).concat([x])
			}
		})
		Object.keys(dupe_groups).forEach(x => {
			dupe_groups[x][cardData[x].group] = (dupe_groups[x][cardData[x].group] || []).concat([x])
		})
		Object.values(dupe_groups).forEach(x => {
			Object.values(x).forEach(y => {
				y.sort((a, b) => parseInt(b.split('.')[0]) - parseInt(a.split('.')[0])).slice(1).forEach(z => {
					delete cardData[z]
				})
			})
		})
		s = Array.from(new Set(Object.values(cardData).map(x => x.risk))).sort((a, b) => (b - a))
		let container = document.getElementById('cards')
		s.forEach(risk => {
			let wrap = document.createElement('div')
			wrap.classList.add('riskWrapper')
			let div = document.createElement('div')
			div.classList.add('riskContainer')
			let div2 = document.createElement('div')
			div2.classList.add('riskHeader')
			let span = document.createElement('span')
			span.innerHTML = 'RISK ' + risk
			let hl = document.createElement('hr')
			div2.appendChild(span)
			div2.appendChild(hl)
			wrap.appendChild(div2)
			wrap.appendChild(div)
			container.appendChild(wrap)
			headersMap[risk] = div
			riskMap[risk] = wrap
			headerCount[risk] = 0
		})
		let all_ops = new Set()
		// let date_index = 0;
		Object.keys(cardData).forEach(k => {
			filterStatus[k] = 0
			let div = document.createElement('div')
			let a = document.createElement('a')
			let is_dupe = cardData[k].duplicate_of !== undefined
			if (is_dupe)
				div.setAttribute('data-dupe', cardData[k].duplicate_of)
			div.setAttribute('data-soul', cardData[k].soul)
			a.classList.add('glightbox')
			a.setAttribute('data-gallery', 'gallery1')
			a.href = './cropped' + CCTAG + '/' + (is_dupe ? 'duplicates/' : '') + k
			let img = document.createElement('img')
			img.src = './thumbs' + CCTAG + '/' + k
			a.appendChild(img)
			div.appendChild(a)
			div.id = k
			div.setAttribute('data-group', cardData[k].group)
			div.classList.add('cardContainer')
			div.setAttribute('data-dateorder', headersMap[cardData[k].risk].childElementCount)
			// lightboxDateOrder[a.href] = date_index++
			// div.style.order = headersMap[cardData[k].risk].childElementCount
			headersMap[cardData[k].risk].appendChild(div)
			headerCount[cardData[k].risk] += 1
			cardData[k]['squad'].forEach(op => {
				all_ops.add(op)
				if (!(op in cardOperatorMap))
					cardOperatorMap[op] = []
				cardOperatorMap[op].push(k)
			})
		})
		Object.keys(riskMap).forEach(k => {
			riskMap[k].setAttribute('cardCount', headerCount[k])
		})
		
		//create initial soul order:
		let soul_index = 0;
		Object.keys(riskMap).slice().reverse().forEach(k => {
			Array.from(riskMap[k].querySelectorAll('.cardContainer')).sort((a, b) => b.dataset.soul - a.dataset.soul).forEach((clear, i) => {
				lightboxSoulOrder[clear.querySelector('a').href] = soul_index++
			})
		})
		//create initial date order:
		let date_index = 0;
		Object.keys(riskMap).slice().reverse().forEach(k => {
			Array.from(riskMap[k].querySelectorAll('.cardContainer')).forEach((clear, i) => {
				lightboxDateOrder[clear.querySelector('a').href] = date_index++
			})
		})
		const orderBtn = document.getElementById('sortOrder')
		orderBtn.onclick = (e) => {
			switch (orderBtn.innerHTML) {
				case 'Order by: Date':
					Object.keys(riskMap).forEach(k => {
						Array.from(riskMap[k].querySelectorAll('.cardContainer')).sort((a, b) => b.dataset.soul - a.dataset.soul).forEach((clear, i) => {
							// clear.style.order = i
							clear.parentElement.append(clear)
						})
					})
					orderBtn.innerHTML = 'Order by: Soul'
					document.body.classList.toggle('soul-mode')
					lightboxElements.sort((a,b) => lightboxSoulOrder[a.href] - lightboxSoulOrder[b.href])

				break;
				case 'Order by: Soul':
					Object.keys(riskMap).forEach(k => {
						Array.from(riskMap[k].querySelectorAll('.cardContainer')).sort((a, b) => a.dataset.dateorder - b.dataset.dateorder).forEach((clear, i) => {
							// clear.style.order = i
							clear.parentElement.append(clear)
						})
					})
					orderBtn.innerHTML = 'Order by: Date'
					document.body.classList.toggle('soul-mode')
					lightboxElements.sort((a,b) => lightboxDateOrder[a.href] - lightboxDateOrder[b.href])
				break;
			}
			// update must be done first, to set lightbox elements to new sort order.
			updateLightbox()
			reloadLightbox()
		}
		

		// create filter
		for (var key in operatorData) {
			if (!all_ops.has(key))
				delete operatorData[key]
		}
		// all operators, we opt instead for only those that appear in at least 1 clear
		// for (var key in operatorData) {
		// if (!operatorData[key].displayNumber)
		// delete operatorData[key]
		// }
		for (var key in operatorData) {
			charIdMap[operatorData[key].name] = key;
		}
		var filtercontainer = document.getElementById('filters')
		divMap = {}
		Object.keys(operatorData).forEach(x => {
			divMap[operatorData[x].name] = CreateOpCheckbox(x);
		})
		Object.values(operatorData).sort((a, b) => a.name > b.name ? 1 : -1).forEach((x, i) => divMap[x.name].style.order = i);

		//click listeners
		Array.from(document.getElementsByClassName('weekFilter')).forEach(x => {
			x.onclick = (e) => {
				weekFilter ^= 2 ** (e.currentTarget.getAttribute('data-group'))
				x.classList.toggle('disabled')
				applyAllFilters()
				updateLightbox()
			}
		})
		// let stylesheet = document.createElement('style')
		// document.head.appendChild(stylesheet)
		// new ResizeObserver(()=>{
		// stylesheet.sheet.insertRule("@media (hover: hover) { body #filters.hidden {"+"top: calc(-"+(filtercontainer.offsetHeight-10)+"px + var(--topNav-height) + 10px);"+"}}", 0);
		// }).observe(filtercontainer)
		function activatefiltercontainer(e) {
			if (e.type=='mousedown')
				filtercontainer.classList.add('active')
			else
				filtercontainer.classList.remove('active')
		}
		filtercontainer.addEventListener('mousedown', activatefiltercontainer)
		filtercontainer.addEventListener('mouseup', activatefiltercontainer)
		filtercontainer.addEventListener('mouseleave', activatefiltercontainer)

		var filtertoggle = document.getElementById('filterToggle')
		function adjustBasedOnScroll () {
			if ((window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop) > filtercontainer.offsetHeight) {
				filtercontainer.classList.add('canSlide')
				filtertoggle.classList.remove('hidden')
			}
			else if ((window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop) > 0 && filtercontainer.classList.contains('active')) {
				filtercontainer.classList.add('canSlide')
				filtertoggle.classList.remove('hidden')
			}
			else {
				filtercontainer.classList.remove('canSlide')
				filtertoggle.classList.add('hidden')
			}
			
		}
		window.onscroll = adjustBasedOnScroll

		let rarityDisp = document.getElementById('rarityDisp')
		document.getElementById('raritySlider').oninput = function() {
			rarityDisp.innerHTML = this.value;
			maxAvgRarity = this.value;
			applyAllFilters()
			updateLightbox()
		}
		let opcountDisp = document.getElementById('opcountDisp')
		document.getElementById('opcountSlider').oninput = function() {
			opcountDisp.innerHTML = this.value;
			maxOpCount = this.value;
			applyAllFilters()
			updateLightbox()
		}
		filtertoggle.onclick = (e) => {
			icon = e.currentTarget.querySelector("i")
			if (icon.classList.contains('fa-caret-up')) {
				filtercontainer.classList.remove('canSlide')
				var canSlideOnLeave = (e) => {
					adjustBasedOnScroll()
					filtertoggle.removeEventListener('mouseleave', canSlideOnLeave)
				}
				filtertoggle.addEventListener('mouseleave', canSlideOnLeave)
			}
			icon.classList.toggle('fa-caret-up')
			icon.classList.toggle('fa-caret-down')
			filtertoggle.classList.toggle('forceShow')
			filtercontainer.classList.toggle('hidden')
		}
		document.getElementById('filterSort').onclick = () => {
			filterSortType = !filterSortType
			if (filterSortType)
				Object.values(operatorData).sort((a, b) => a.name > b.name ? 1 : -1).forEach((x, i) => divMap[x.name].style.order = i);
			else
				Object.values(operatorData).sort((a, b) =>
					a.rarity == b.rarity ? (a.name > b.name ? 1 : -1) : (a.rarity < b.rarity ? 1 : -1)).forEach((x, i) => divMap[x.name].style.order = i);
		}
		document.getElementById('filterInvert').onclick = (e) => {
			thisButton = e.currentTarget;
			if (invertFilter) {
				invertFilter = !invertFilter
			} else if (includesAll) {
				includesAll = !includesAll
			} else {
				invertFilter = !invertFilter
				includesAll = !includesAll
			}
			thisButton.innerHTML = invertFilter ? "Excludes" : includesAll ? "Includes (All)" : "Includes (Any)"
			applyAllFilters()
			updateLightbox()
		}

		document.getElementById('filterReset').onclick = resetFilters
		
		lightbox.reload()
		lightboxElements = lightbox.elements
		reloadLightbox()
		
		lightbox.on('slide_before_load', (data) => {
			const { slideIndex, slideNode, slideConfig, player, trigger } = data;
			let [index, soul, group, dupe] = slideConfig.content.split(',')
			slideNode.setAttribute('data-group', group);
			slideConfig.description = '&nbsp'
			slideNode.querySelector('.gslide-description').setAttribute('data-soul', soul);
			slideNode.querySelector('.gslide-description').classList.add('button')
			if (dupe) {
				slideNode.setAttribute('data-dupe', dupe)
				slideConfig.description+='More from this doctor <i class="fas fa-arrow-alt-circle-right"></i>'
			}
		});
		lightbox.on('slide_after_load', (data) => {
			const { slideIndex, slideNode, slideConfig, player, trigger } = data;
			let [index, soul, group, dupe] = slideConfig.content.split(',')
			let dupeDiv = slideNode.querySelector('.gdesc-inner')
			if (dupeDiv)
				dupeDiv.onclick = () => {
					// check slide at expected index, if its a match just scroll to it.
					// if not a match you need to traverse backwards until you find either the slide or an earlier slide.
					// if you found an earlier slide, insert the slide right after it.
					idx = parseInt(lightboxElements[lightboxMapping[dupe]].index)
					// index attribute is not accurate, it won't be updated if order is changed.
					// instead we use the key from lightboxElements
					idx = parseInt(lightboxMapping[dupe])
					function getIndex(lightboxElement) {
						return parseInt(lightboxElement.slideConfig.content.split(',')[0])
					}
					if (lightbox.elements[idx] && getIndex(lightbox.elements[idx]) == idx) {
						// found slide at expected index
						lightbox.goToSlide(idx)
						return
					}
					let i = Math.min(idx, lightbox.elements.length-1)
					for (; i >= 0; i--) {
						if (getIndex(lightbox.elements[i]) == parseInt(idx)) {
							// found exact match
							lightbox.goToSlide(i)
							return
						}
						if (getIndex(lightbox.elements[i]) < parseInt(idx)) {
							// could not find exact match, need to insert new slide.
							break
						}
					}
					lightbox.insertSlide(lightboxElements[lightboxMapping[dupe]],i+1)
					lightbox.goToSlide(i+1)
				}

		});
		updateLightbox()
	})
function reloadLightbox() {
	lightboxMapping = {}
	// map to lightbox elements for easy access
	for (let e in Object.keys(lightboxElements))
		lightboxMapping[lightboxElements[e].href.split('/').slice(-1)[0]] = e
	Object.entries(lightboxMapping).forEach(([k,v]) => {
		// hack: store data in content field of slideConfig
		lightboxElements[v].slideConfig.content = ''+v
		lightboxElements[v].slideConfig.content += ','+cardData[k].soul
		lightboxElements[v].slideConfig.content += ','+cardData[k].group
		lightboxElements[v].content = ''+v
		lightboxElements[v].content += ','+cardData[k].soul
		lightboxElements[v].content += ','+cardData[k].group
		has_dupe = cardData[k].duplicate_of || ((k in dupe_groups) ? k : undefined)
		if (has_dupe) {
			next_dupe = (dupe_groups[has_dupe][(cardData[k].group+1)%3] || dupe_groups[has_dupe][(cardData[k].group+2)%3] || dupe_groups[has_dupe][(cardData[k].group+3)%3])[0]
			if (next_dupe != k) {
				// don't set next dupe to self.
				lightboxElements[v].content += ','+next_dupe
				lightboxElements[v].slideConfig.content += ','+next_dupe
			}
		}
	})
}
function resetFilters() {
	totalChecked = 0
	weekFilter = 7
	Object.keys(riskMap).forEach(k => {
		headerCount[k] = parseInt(riskMap[k].getAttribute('cardCount'))
		riskMap[k].classList.remove('hidden')
	})
	Object.keys(filterStatus).forEach(k => filterStatus[k] = 0)
	Object.keys(cardData).forEach(k => {
		document.getElementById(k).classList.remove('hidden')
	})
	Array.from(document.getElementsByClassName('operatorCheckbox')).forEach(x => x.classList.remove('_selected'))
	Array.from(document.getElementsByClassName('riskContainer')).forEach(x => x.classList.remove('hidden'))
	Array.from(document.getElementsByClassName('weekFilter')).forEach(x => x.classList.remove('disabled'))
	document.getElementById('opcountSlider').value = 13
	document.getElementById('opcountDisp').innerHTML = 13
	maxOpCount = 13;
	document.getElementById('raritySlider').value = 6
	document.getElementById('rarityDisp').innerHTML = 6
	maxAvgRarity = 6
	updateLightbox()
}

function updateLightbox() {
	// you can directly assign to lightbox.elements and its a bit quicker, we avoid it as it might break something unknown (for one thing, the .index property won't be correct ** actually .index is never correct after resorting, so don't rely on it.)
	lightbox.setElements(lightboxElements.filter(x => _filterShouldShow(x.href.split('/').slice(-1)[0])))
}

function _filterShouldShow(key) {
	let shouldShow = 2 ** document.getElementById(key).getAttribute('data-group') & weekFilter
	shouldShow = shouldShow && (cardData[key].opcount <= maxOpCount)
	shouldShow = shouldShow && (cardData[key].avgRarity <= maxAvgRarity)
	if (totalChecked == 0)
		return shouldShow && true
	if (filterStatus[key] == 0)
		return shouldShow && (false ^ invertFilter)
	if (!invertFilter && includesAll)
		return shouldShow && (filterStatus[key] == totalChecked)
	return shouldShow && (true ^ invertFilter)
}

function showCard(key, show = true) {
	let prev = document.getElementById(key).classList.contains('hidden')
	if (show) {
		document.getElementById(key).classList.remove('hidden')
		document.getElementById(key).children[0].classList.add('glightbox')
		if (prev)
			headerCount[cardData[key].risk] += 1
	} else {
		document.getElementById(key).classList.add('hidden')
		document.getElementById(key).children[0].classList.remove('glightbox')
		if (!prev)
			headerCount[cardData[key].risk] -= 1
	}
	if (0 == headerCount[cardData[key].risk])
		riskMap[cardData[key].risk].classList.add('hidden')
	else
		riskMap[cardData[key].risk].classList.remove('hidden')
}

function applyAllFilters() {
	Object.keys(filterStatus).forEach(key => {
		showCard(key, _filterShouldShow(key))
	})
}

function updateFilterStatus(key, delta) {
	// update filtering count for a card, then show/hide as necessary
	filterStatus[key] += delta
	showCard(key, _filterShouldShow(key))
}

function applyFilters(opname, checked) {
	let prev = totalChecked
	totalChecked += checked ? 1 : -1
	if (totalChecked == checked) //went from 0 to 1
		applyAllFilters()

	if (opname in cardOperatorMap) {
		cardOperatorMap[opname].forEach(k => {
			updateFilterStatus(k, checked ? 1 : -1)
		})
	}
	if (!invertFilter && totalChecked)
		applyAllFilters()

	if (0 == totalChecked)
		applyAllFilters()
	updateLightbox()
}

function CreateOpCheckbox(operator) {
	let operatorName = operatorData[operator].name;

	var checkboxDiv = document.createElement("div");
	checkboxDiv.classList.add('operatorCheckbox');
	// checkboxDiv.setAttribute('data-class', operator.profession);
	checkboxDiv.classList.add('show');
	checkboxDiv.onclick = () => {
		checkboxDiv.classList.toggle('_selected')
		applyFilters(operator, checkboxDiv.classList.contains('_selected'))
	}
	if (charIdMap[operatorName]) {
		let im = document.createElement('img');
		im.src = 'https://aceship.github.io/AN-EN-Tags/img/avatars/' + charIdMap[operatorName] + '.png';
		checkboxDiv.appendChild(im);
	}
	let name = document.createElement('div');
	name.classList.add('name');
	name.innerHTML = operatorName;
	checkboxDiv.appendChild(name);
	document.getElementById("checkboxes").appendChild(checkboxDiv);
	return checkboxDiv;
}
