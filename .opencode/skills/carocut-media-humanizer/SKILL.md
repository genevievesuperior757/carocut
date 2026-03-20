---
name: carocut-media-humanizer
description: 旁白脚本去 AI 味处理与讲故事优化。Phase 1：识别并移除 13 类 AI 生成文本模式（夸张重要性、模糊归因、AI 词汇等）。Phase 2：基于盖曼讲故事法则进行叙事声音统一、冰山改写、对白自然化、结尾句优化、节奏感塑造。Phase 3：情绪节奏标注（emotion/tension/beat/breathing HTML 注释）。包含完整的模式定义、标记词列表、讲故事原则和质量评分体系（85分制）。
---

# Script Humanizer

Removes AI writing patterns to make voiceover scripts sound human. Based on documented AI writing patterns that trained language models tend to produce.

## Core Rules

| Rule | Action |
|------|--------|
| Delete filler phrases | Remove connectors that add no information |
| Break formula structures | Avoid binary comparisons, dramatic reveals |
| Vary rhythm | Mix sentence lengths, use 2 or 4 items instead of 3 |
| Trust readers | State facts directly, skip softening language |
| No slogans | If it sounds quotable, rewrite it |

---

## Content Patterns to Fix

### 1. Exaggerated Significance

**Flagged Words:** "marks a", "key moment", "demonstrates the importance", "highlights", "underscores", "reflects broader", "symbolizes", "contributes to", "paves the way"

**Wrong:**
```
这一举措标志着云原生架构发展史上的关键时刻，凸显了消息队列系统在现代分布式架构中的重要作用。
```

**Correct:**
```
消息队列是分布式系统的核心。有了它，每秒百万级请求也能稳定处理。
```

### 2. Vague Attribution

**Flagged Words:** "experts believe", "studies show", "industry reports indicate", "observers note", "some critics argue"

**Wrong:**
```
专家认为这种技术在提高系统可靠性方面发挥着至关重要的作用。研究表明它能显著提升性能。
```

**Correct:**
```
根据清华大学 2023 年的测试，采用该技术后系统吞吐量提升了 3 倍。
```

### 3. AI Vocabulary

**High-frequency AI words (Chinese):**
- "此外" (furthermore)
- "至关重要" (crucial)
- "深入探讨" (delve into)
- "格局" (landscape)
- "展示" (showcase)
- "彰显" (highlight)
- "确保" (ensure)
- "独特" (unique)
- "全面" (comprehensive)

**Wrong:**
```
此外，消息队列系统作为现代分布式架构的关键组件，在确保系统可靠性方面发挥着至关重要的作用。
```

**Correct:**
```
消息队列让系统更稳定。服务之间通过它传递数据，即使某个服务暂时挂了，消息也不会丢。
```

### 4. Copula Evasion

**Flagged Patterns:** "serves as", "acts as", "functions as", "represents"

**Wrong:**
```
Gallery 825 作为 LAAA 的当代艺术展览空间。画廊设有四个独立空间，拥有超过 3000 平方英尺。
```

**Correct:**
```
Gallery 825 是 LAAA 的当代艺术展览空间。画廊有四个房间，总面积 3000 平方英尺。
```

### 5. Rule of Three Overuse

AI tends to force ideas into groups of three for artificial "completeness".

**Wrong:**
```
活动包括主题演讲、小组讨论和社交机会。与会者可以期待创新、灵感和行业洞察。
```

**Correct:**
```
活动包括演讲和小组讨论。会议之间有非正式社交的时间。
```

**Rule:** Use 2 or 4 items, not 3.

### 6. Generic Positive Conclusions

**Flagged Words:** "bright future", "pursuit of excellence", "important step forward", "exciting times ahead"

**Wrong:**
```
公司的未来看起来光明。激动人心的时代即将到来，他们继续追求卓越的旅程。
```

**Correct:**
```
公司计划明年再开设两个分支机构。
```

### 7. -ing Phrase Shallow Analysis

**Flagged Patterns:** "highlighting...", "ensuring...", "reflecting...", "contributing to...", "fostering..."

**Wrong:**
```
寺庙的蓝色、绿色和金色色调与该地区的自然美景产生共鸣，象征着德克萨斯州的蓝帽花、墨西哥湾和多样化的德克萨斯州景观，反映了社区与土地的深厚联系。
```

**Correct:**
```
寺庙使用蓝色、绿色和金色。建筑师表示这些颜色是为了呼应当地的蓝帽花和墨西哥湾海岸。
```

---

## Style Patterns to Fix

### 8. Dash Overuse

AI uses dashes more frequently than humans, mimicking "punchy" sales copy.

**Wrong:**
```
这个术语主要由荷兰机构推广——而不是由人民自己。你不会说"荷兰，欧洲"作为地址——但这种错误标记仍在继续——即使在官方文件中。
```

**Correct:**
```
这个术语主要由荷兰机构推广，而不是由人民自己。你不会说"荷兰，欧洲"作为地址，但这种错误标记在官方文件中仍在继续。
```

### 9. Negation Parallelism

**Flagged Patterns:** "not just...but...", "this is not merely...it is..."

**Wrong:**
```
这不仅仅是一次更新，而是我们思考生产力方式的革命。
```

**Correct:**
```
更新添加了批处理和键盘快捷键。
```

### 10. Synonym Cycling

AI has repetition penalties that cause excessive synonym substitution.

**Wrong:**
```
主人公面临许多挑战。主要角色必须克服障碍。中心人物最终获得胜利。英雄回到家中。
```

**Correct:**
```
主人公面临许多挑战，但最终获得胜利并回到家中。
```

---

## Communication Patterns to Fix

### 11. Collaborative Traces

**Flagged Words:** "Hope this helps!", "Certainly!", "Absolutely!", "You're absolutely right!", "Let me know if..."

These indicate text was copy-pasted from chatbot conversations.

**Wrong:**
```
这是法国大革命的概述。希望这对您有帮助！如果您想让我扩展任何部分，请告诉我。
```

**Correct:**
```
法国大革命始于 1789 年，当时财政危机和粮食短缺导致了广泛的动荡。
```

### 12. Filler Phrases

Replace or remove these phrases:

| Filler | Replacement |
|--------|-------------|
| "为了实现这一目标" | "为了" |
| "由于下雨的事实" | "因为下雨" |
| "在这个时间点" | "现在" |
| "值得注意的是" | (delete) |
| "在某种程度上" | (delete or be specific) |
| "可以说" | (delete) |

### 13. Over-qualification

**Wrong:**
```
可以潜在地可能被认为该政策可能会对结果产生一些影响。
```

**Correct:**
```
该政策可能会影响结果。
```

---

## Rhythm and Flow

### Sentence Length Variation

- Do not have 3+ consecutive sentences of similar length
- Mix short punchy sentences with longer explanatory ones
- Paragraph endings should vary in structure

### Connector Minimization

Reduce usage of:
- "此外" (Furthermore)
- "然而" (However)
- "因此" (Therefore)
- "事实上" (In fact)
- "值得注意的是" (It's worth noting)

These connectors often add no information. Either delete them or restructure so the connection is implicit.

---

## Storytelling Voice Enhancement — 盖曼讲故事法则

Beyond removing AI patterns, the humanizer must **actively improve** the script's storytelling quality. These principles come from Neil Gaiman's "The Art of Storytelling" and should be applied after AI pattern removal.

### Voice Consistency (叙事声音统一)

- Read `manifests/memo.md` to understand the defined **Narrative Voice**
- Every rewritten line must sound like it comes from the same narrator
- If the memo defines the voice as "intimate and conversational", then no line should sound like a textbook
- If the memo defines the voice as "authoritative", then no line should sound casual or uncertain
- **Test:** After rewriting, read all VO lines in sequence. They must feel like one person speaking in one sitting.

### Iceberg Rewriting (冰山改写)

- When a VO line over-explains, cut the explanation and let the fact stand alone
- Trust the visuals to carry context. The voiceover does not need to narrate what the viewer can see.
- Prefer one vivid specific detail over three abstract statements
- 写出来的只是冰山一角。观众越聪明，你需要说的越少。

### Dialogue Naturalism (对白自然感)

- Rewrite lines so they sound **overheard, not composed** (像偷听到的，不是被灌输的)
- Real speech has:
  - Uneven rhythm — a short sentence, then a longer one, then a fragment
  - Emphasis through position, not through intensifiers ("这就是核心" vs "这是至关重要的核心")
  - Occasional directness that breaks pattern ("说白了", "换句话说", a sudden short sentence)
- Remove any line that sounds like it was written to be impressive rather than to communicate

### Humor Preservation (保留幽默)

- If the original script contains natural humor (wry observations, unexpected comparisons), **preserve and enhance it**
- Do not flatten humor into neutral professional language during AI-pattern removal
- Humor creates trust between narrator and audience. It is a storytelling asset, not a flaw to be corrected.

### Emotional Specificity (情绪具体化)

- Replace generic emotional language with specific, grounded expressions
- "令人激动" → describe what actually happened that would excite someone
- "意义重大" → state the specific consequence that makes it significant
- Gaiman's principle: emotions are earned through concrete detail, not declared through adjectives

### Ending Lines (结尾句)

- Pay special attention to the **last VO line** of each chapter and the **final VO line** of the entire script
- Endings must resonate, not summarize. They should leave the viewer with a thought, an image, or a feeling.
- 结尾比开头更重要。结尾决定观众记住什么。
- Rewrite generic closings into specific, resonant final lines.

### Pacing and Rhythm (节奏感)

Sentence structure directly drives the video's pacing. When rewriting, consciously shape rhythm:

| Sentence Pattern | Effect | Corresponding Storyboard Pacing |
|-----------------|--------|-------------------------------|
| 短句、断句 | 快节奏、紧张感 | `pacing=fast` |
| 长句、从句、描述性段落 | 慢节奏、沉浸感 | `pacing=slow` |
| 停顿、省略号、断句 | 呼吸点、留白 | `breathing` |
| 反问句 | 张力上升 | `visual_tension` 上升 |
| 描述性段落 | 张力维持 | `visual_tension` 维持 |

- A good script alternates fast and slow rhythm, not a flat monotone pace
- Use short punchy sentences at turning points and climaxes (fast pacing)
- Use longer, flowing sentences for immersive exposition (slow pacing)
- Place natural pauses (ellipsis, line breaks) at chapter transitions (breathing points)
- Rhetorical questions should coincide with rising tension in the narrative arc
- 节奏是文字的呼吸。好的脚本像音乐一样有强弱、有快慢。

---

## Processing Workflow

1. Read `manifests/memo.md` to understand the defined narrative voice, emotional arc, and storytelling intent
2. Read the input text (manifests/script.md)
3. **Phase 1 — AI Pattern Removal:** Scan for all 13 patterns listed above and remove them
4. **Phase 2 — Storytelling Enhancement:** Apply the Gaiman storytelling principles:
   - Ensure voice consistency across all VO lines
   - Apply iceberg rewriting (cut over-explanation, trust visuals)
   - Naturalize dialogue rhythm
   - Preserve or enhance natural humor
   - Replace generic emotions with specific details
   - Strengthen chapter endings and the final line
5. **Phase 3 — Emotion Rhythm Annotation:** Add HTML comment annotations to each VO paragraph (see below)
6. **Preserve all [VO_XXX] markers exactly** - these link to storyboard
7. Present the humanized version

---

## Emotion Rhythm Annotation (情绪节奏标注)

After humanizing and enhancing the script, annotate each VO paragraph with HTML comment metadata. These annotations are consumed by the Planner to generate storyboard fields (`pacing`, `visual_tension`, `audio_visual_relation`, `breathing`).

### Annotation Format

```markdown
<!-- emotion: 好奇, tension: 0.3 -->
[VO_001] 你有没有想过，为什么日本的网页看起来如此不同？

<!-- emotion: 震惊, tension: 0.8, beat: 转折 -->
[VO_005] 但真相远比你想象的复杂。

<!-- breathing -->
（此处插入呼吸段，章节过渡）

<!-- emotion: 沉浸, tension: 0.5 -->
[VO_006] 让我们从文字本身说起。
```

### Annotation Fields

| Field | Values | Description |
|-------|--------|-------------|
| `emotion` | 好奇 / 沉浸 / 震惊 / 理解 / 共鸣 / 紧张 / 释放 / 感动 | 当前段落的主要情绪 |
| `tension` | 0.0 - 1.0 | 张力值，反映叙事紧张程度 |
| `beat: 转折` | 转折 | 标记叙事转折点（仅在转折处添加） |
| `breathing` | (standalone) | 标记章节过渡处，Planner 会在此处插入 breathing shot |

### Annotation Rules

- Every `[VO_XXX]` paragraph must have an `<!-- emotion: ..., tension: ... -->` comment directly above it
- `breathing` annotations are placed between chapters/sections, not attached to a VO line
- Tension values should form a natural arc: rising toward turning points, dropping after resolution
- `beat: 转折` should be used sparingly (typically 2-3 per script) at major narrative shifts
- The emotion vocabulary is fixed to the 8 values listed above; do not invent new ones

---

## Incremental Mode

当 dispatch context 中 mode: "incremental" 时：

### 输入
- amendment.affected_resources 中指定的 VO 段落 ID 列表

### 执行规则
1. 读取 script.md，仅定位指定的 VO 段落
2. 对指定段落执行完整的 13 类模式检测和替换
3. 不触碰未指定的 VO 段落
4. 保持 [VO_XXX] 标记不变
5. 返回修改摘要（修改了哪些段落、移除了多少处模式）

### 不执行
- 不重新处理整个 script.md
- 不修改 VO 编号或段落顺序

---

## Quality Checklist

Before delivery, verify:

### AI Pattern Removal
- [ ] No three consecutive same-length sentences
- [ ] Minimal connectors (此外, However)
- [ ] Lists have 2 or 4 items, not 3
- [ ] All [VO_XXX] markers preserved
- [ ] No "experts believe" or "studies show" without specific sources
- [ ] No dramatic conclusions or slogans
- [ ] Direct "is/are" used instead of "serves as/acts as"

### Storytelling Craft (盖曼法则)
- [ ] All VO lines sound like one consistent narrator (read aloud test)
- [ ] No line over-explains what visuals can convey (iceberg principle)
- [ ] Each chapter's final VO line resonates rather than summarizes
- [ ] The script's final VO line leaves a lasting impression, not a generic conclusion
- [ ] Natural humor preserved (not flattened during AI-pattern removal)
- [ ] Generic emotional language replaced with specific concrete details
- [ ] Lines sound overheard, not composed (dialogue naturalism)

---

## Quality Scoring

Rate the rewritten text on 1-10 scale for each dimension (total 85):

### AI Pattern Removal (50 points)

| Dimension | Criteria | Score |
|-----------|----------|-------|
| Directness | States facts without preamble | /10 |
| Rhythm | Varied sentence lengths | /10 |
| Trust | Respects reader intelligence | /10 |
| Authenticity | Sounds like real human speech | /10 |
| Concision | No unnecessary words | /10 |
| **Subtotal** | | **/50** |

### Storytelling Craft — 盖曼法则 (35 points)

| Dimension | Criteria | Score |
|-----------|----------|-------|
| Voice Consistency | All VO lines sound like one narrator with one personality | /10 |
| Iceberg Depth | Script implies more than it states; trusts visuals to carry context | /10 |
| Resonant Ending | Final lines of chapters and script leave lasting impression, not summary | /10 |
| Rhythm Diversity | Script has intentional fast/slow alternation, not flat monotone pacing | /5 |
| **Subtotal** | | **/35** |

### Combined Score

| Rating | Range | Meaning |
|--------|-------|---------|
| Excellent | 75-85 | AI traces removed, storytelling craft strong, rhythm varied |
| Good | 60-74 | Solid work, minor storytelling improvements possible |
| Needs Revision | Below 60 | Significant issues in AI patterns or storytelling craft |

---

## Example Transformation

### Before (AI patterns)

```markdown
- **[VO_001]** "此外，消息队列系统作为现代分布式架构的关键组件，在确保系统可靠性方面发挥着至关重要的作用。"
- **[VO_002]** "这一技术不仅仅是一个工具，而是推动数字化转型的核心引擎，为企业带来前所未有的机遇。"
- **[VO_003]** "总而言之，消息队列技术的未来一片光明，它将继续在推动技术创新方面发挥重要作用。"
```

### After (humanized + storytelling enhanced)

```markdown
- **[VO_001]** "消息队列是分布式系统的核心。有了它，每秒百万级请求也能稳定处理。"
- **[VO_002]** "三年前，我们每天处理 10 万条消息。现在是 500 万条，系统没崩过一次。"
- **[VO_003]** "下一个瓶颈不在消息队列。在你怎么用它。"
```

### Phase 1 Changes (AI Pattern Removal)
- Removed "此外" and "作为...的关键组件" construction
- Replaced "至关重要的作用" with concrete example
- Deleted "不仅仅是...而是..." pattern
- Added specific numbers instead of vague claims
- Shortened sentences, added variety

### Phase 2 Changes (Storytelling Enhancement)
- VO_003 ending rewritten: removed generic positive conclusion ("未来一片光明"), replaced with a resonant closing that challenges the viewer (结尾共鸣)
- Iceberg applied: VO_001 states the core fact, lets visuals show the architecture (冰山改写)
- VO_002 uses specific narrative ("三年前...现在") — sounds overheard, creates a story arc in two sentences (对白自然感)

---

## User Communication

### Completion Report

```
文稿润色完成。

修改统计:
  Phase 1 — AI 模式移除:
    - AI 模式移除: 15 处
    - 句子重写: 8 处
    - 连接词删除: 12 处
  Phase 2 — 讲故事优化:
    - 声音一致性调整: 3 处
    - 冰山改写（删减过度解释）: 5 处
    - 结尾句优化: 2 处

质量评分: 76/85
  AI 模式移除 (46/50):
    - 直接性: 9/10
    - 节奏感: 9/10
    - 信任度: 10/10
    - 真实性: 9/10
    - 精炼度: 9/10
  讲故事法则 (30/35):
    - 声音统一: 9/10
    - 冰山深度: 8/10
    - 结尾共鸣: 9/10
    - 节奏多样性: 4/5

所有 [VO_XXX] 标记已保留。

请审阅 manifests/script.md
确认后继续下一步。
```

---

## Important Notes

- **Never change [VO_XXX] markers** - these are critical references for storyboard linking
- Input file: `manifests/script.md`
- Output: Same file, overwritten with humanized content
- If user disagrees with changes, iterate based on feedback
- Focus on Chinese text patterns; English code/technical terms should remain unchanged
