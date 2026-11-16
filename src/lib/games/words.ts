/** Common English words for Verbal Memory. Chosen to be familiar, distinct and unambiguous. */
const RAW = `
abbey absent accent acorn actor adult advice affair agent alarm album alley almond amber anchor angel angle
ankle answer anthem apple apron arch archer arena armour arrow artist ashes atlas attic autumn avenue badge
baker balcony ballet bamboo banner barley barrel basin basket battle beacon beard beetle bell bench berry
bishop blanket blossom board bonfire border bottle boulder bracket branch brass bread breeze brick bridge
bronze brook broom bucket buckle budget bundle burrow butter button cabin cable cactus camel canal candle
canvas canyon captain carbon carpet carrot castle cattle cellar census chalk chapel chariot cheese cherry
chess chimney chorus cinema circle circus citizen clay cliff climate clock closet cloud clover coach coast
cobalt coffee collar colony comet compass copper coral cotton cougar council county cradle crater crayon
cricket crimson crown crystal cupboard curtain cushion custom cypress dagger dancer dawn debate decade
desert diamond diary dinner doctor dolphin domain donkey doorway dragon drawer dream drift drum eagle
earth echo elbow ember empire engine envoy essay estate ethics falcon fabric factory fallow famine feather
fence ferry fever fiddle field figure finch flame flannel fleet flint flood flour flute forest forge
fossil fountain fox frame freedom frost fruit funnel furnace gallery garden garlic garnet gate gazelle
geyser ghost giant ginger glacier glass globe glove goblet granite grape gravel harbour harvest hatch
hawk hazel heart hedge helmet herald hermit heron highway hinge hockey honey horizon hornet hotel hunter
hymn iceberg icon idea igloo image ink insect island ivory jacket jaguar jasmine jelly jewel journal
journey judge juggler jungle kernel kettle kingdom kitchen kite knight knot ladder lagoon lake lantern
laser lattice laurel lava lawyer leather ledger legend lemon lens leopard letter lichen lighthouse lily
linen lion lizard lobster locket lodge lotus lumber magnet mammoth mango mansion maple marble market
marsh mask meadow medal melody mercury meteor mirror mitten monarch monk moose mosaic moss mountain
muffin museum music mustard myth napkin narrator nation nebula needle nest nickel noodle novel nutmeg
oak oasis ocean office olive onion opera orbit orchard orchid organ ostrich otter outpost owl oxygen
oyster paddle palace panther paper parade parcel parrot pasture pebble pelican pencil pepper piano
pigeon pilgrim pillar pillow pilot pine pirate planet plaster plateau plum poem poet pollen pond poppy
porch portrait potato pottery prairie prism prophet pulse pumpkin puppet puzzle pyramid quarry quartz
queen quill quiver rabbit raccoon radar radio raft rain raven razor recipe reef relic ribbon riddle
river robin rocket roof rope rose ruby saddle saffron sailor salmon sapphire satchel saucer scarf
scholar scroll sculptor season senate shadow shelter shield shovel signal silver singer sketch sleeve
slipper smoke snail socket soldier sonnet sparrow sphere spider spiral sponge spruce squirrel stable
stadium staple statue steam stencil stone storm stove straw stream string summit sunset swallow swamp
sword symbol syrup tablet tailor tapestry tavern teacher temple tennis tent theatre thistle thorn
thread throne thunder ticket tiger timber toast tobacco tomato torch tortoise tower tractor trail
treaty trellis trumpet tulip tunnel turbine turtle twilight umbrella uniform valley vapour vault
velvet venom verdict vessel viking village vine violin volcano voyage wagon walnut walrus wander
warden wardrobe warrior weasel whale wheat whisker whistle widow willow window winter wizard wolf
wonder wool workshop wreath yacht yarn yeast zebra zenith zephyr
brave calm clever eager fierce gentle humble jolly lively modest noble polite proud quiet rapid
silent swift tender vivid wise ancient bitter bright cheap crisp damp dense dull early empty fair
fragile frozen gloomy hollow honest huge loyal narrow pale plain rough rural shallow sharp shiny
smooth solid sour steep sticky stormy sturdy sudden tidy tiny vacant vast warm wicked wild
balance borrow carry decide deliver depart discover explain follow gather glance harvest imagine
invent kneel launch listen measure mention observe perform polish prepare protect quarrel recover
remember repair rescue scatter scribble settle shiver stumble surrender tremble venture whisper wrestle
`;

export const WORDS: readonly string[] = Array.from(new Set(RAW.split(/\s+/).filter((w) => w.length >= 3)));
