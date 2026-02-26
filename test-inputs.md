# Test Inputs for Organization Methods

Copy and paste these into the scratchpad to test each organization strategy.

---

## TEST 1: Official Docs (React)
**Expected:** `organizationMethod: "official-docs"` - All hooks grouped together

```
Today I learned about React hooks. useState is for local state, useEffect handles side effects.
useCallback memoizes functions to prevent unnecessary re-renders. This is important for performance optimization.
useReducer is better than useState for complex state with multiple sub-values. It's similar to Redux pattern.
useMemo caches computed values between renders.
Remember: React components re-render when state or props change.
Also learned about useContext - it lets you subscribe to React context without nesting.
useRef persists values between renders without causing re-renders.
```

---

## TEST 2: Official Docs (Python)
**Expected:** `organizationMethod: "official-docs"` - Decorators together, comprehensions together

```
Python decorators are functions that modify other functions. 
@staticmethod makes a method that doesn't receive self.
@classmethod receives cls instead of self.
@property turns a method into a getter.
List comprehensions: [x*2 for x in range(10)]
Dictionary comprehensions: {k: v for k, v in items}
Set comprehensions: {x for x in list if x > 0}
Generators use yield and are memory efficient for large datasets.
Generator expressions: (x*2 for x in range(10))
```

---

## TEST 3: Textbook Style (Biology)
**Expected:** `organizationMethod: "textbook"` - Organized like a biology textbook

```
Mitochondria are the powerhouse of the cell, producing ATP through cellular respiration.
The cell membrane is a phospholipid bilayer that controls what enters and exits.
DNA stores genetic information in the nucleus.
RNA carries instructions from DNA to ribosomes.
Ribosomes synthesize proteins based on mRNA sequences.
The endoplasmic reticulum comes in rough (with ribosomes) and smooth (lipid synthesis).
Golgi apparatus packages proteins for transport.
Lysosomes contain digestive enzymes that break down waste.
```

---

## TEST 4: Textbook Style (History)
**Expected:** `organizationMethod: "textbook"` - Chronological or thematic organization

```
The Renaissance began in Italy in the 14th century.
Leonardo da Vinci painted the Mona Lisa around 1503-1519.
The printing press was invented by Gutenberg in 1440.
Michelangelo completed the Sistine Chapel ceiling in 1512.
The Protestant Reformation started in 1517 with Martin Luther's 95 Theses.
The Age of Exploration saw Columbus reach the Americas in 1492.
Machiavelli wrote The Prince in 1513.
The Medici family were major patrons of Renaissance art in Florence.
```

---

## TEST 5: Fallback (Niche Topic - Homebrewing)
**Expected:** `organizationMethod: "fallback"` with notification popup

```
Primary fermentation takes 1-2 weeks until airlock activity slows.
Original gravity should be measured before pitching yeast.
Dry hopping adds aroma without bitterness, do it in secondary.
Sanitize everything that touches the wort after boiling.
Final gravity tells you when fermentation is complete.
Cold crash for 24-48 hours to clarify the beer.
Bottle conditioning takes 2-3 weeks for carbonation.
Pitch rate matters - underpitching causes off-flavors.
Mash temperature affects body: higher temp = fuller body.
```

---

## TEST 6: Fallback (Very Obscure - Bonsai)
**Expected:** `organizationMethod: "fallback"` with notification popup

```
Wire should be applied in fall when branches are flexible.
Remove wire before it cuts into the bark, usually after 3-6 months.
Juniper bonsai can handle full sun and need it for good growth.
Repot deciduous trees in early spring before buds open.
Root pruning is done during repotting, remove about 1/3 of roots.
Akadama soil retains moisture but still drains well.
Never let the soil completely dry out.
Pinching new growth maintains shape between major prunings.
Deadwood techniques: jin (dead branch) and shari (dead trunk area).
```

---

## TEST 7: Mixed Topics
**Expected:** Should create MULTIPLE pages, one for each topic

```
React useEffect runs after every render by default.
In Python, you can use *args for variable positional arguments.
useCallback helps prevent child components from re-rendering.
Python's **kwargs handles variable keyword arguments.
Redux uses a single store for application state.
Python list slicing: my_list[1:5] gets elements 1-4.
React context avoids prop drilling for deeply nested components.
```

---

## Verification Checklist

After each test, check:
1. [ ] Did the notification popup appear for fallback? (Tests 5 & 6)
2. [ ] Were related APIs grouped together? (Tests 1 & 2)
3. [ ] Was content organized logically for non-tech topics? (Tests 3 & 4)
4. [ ] Were multiple pages created for mixed content? (Test 7)
5. [ ] Check activity log for organization method used
