import { RefinementQuestion } from '@/types';

// Mock refinement questions for different scenarios
const mockRefinementQuestions = [
  [
    { id: 'q1', question: 'What specific time period are you interested in researching?' },
    { id: 'q2', question: 'Are you looking for a particular aspect or application area?' },
    { id: 'q3', question: 'What level of technical depth would you prefer in the research?' },
  ],
  [
    { id: 'q1', question: 'Which geographic region or country should I focus on?' },
    { id: 'q2', question: 'Are you interested in historical context or current developments?' },
  ],
  [
    { id: 'q1', question: 'What is the primary purpose of this research (academic, business, personal)?' },
    { id: 'q2', question: 'Should I prioritize recent sources or include foundational research?' },
    { id: 'q3', question: 'Are there any specific subtopics you want to exclude?' },
  ],
];

// Mock research results
const mockOpenAIResults = [
  `# Comprehensive Research Analysis

## Executive Summary
Based on the refined research parameters, I've conducted an in-depth analysis across multiple dimensions. The findings reveal significant developments and emerging trends that warrant attention.

## Key Findings

### 1. Primary Insights
The current landscape shows remarkable evolution, particularly in the areas specified. Recent data indicates a 45% increase in adoption rates over the past 18 months, driven primarily by technological advancements and changing market dynamics.

### 2. Critical Developments
Several breakthrough innovations have emerged:
- **Innovation A**: Represents a paradigm shift in how stakeholders approach traditional challenges
- **Innovation B**: Demonstrates significant efficiency improvements (up to 60% in controlled environments)
- **Innovation C**: Opens new possibilities for cross-sector applications

### 3. Market Dynamics
The competitive landscape has shifted dramatically, with new entrants disrupting established patterns. Market leaders are responding through strategic partnerships and R&D investments totaling $2.3B annually.

## Challenges and Limitations
Despite progress, several obstacles remain:
1. Regulatory frameworks lag behind technological capabilities
2. Integration challenges with legacy systems
3. Skill gaps in the workforce requiring substantial training investments

## Future Outlook
Projections suggest continued growth trajectory, with conservative estimates indicating 120% expansion by 2027. However, success depends on addressing current limitations and maintaining sustainable development practices.

## Sources
- Academic Journal of Research Studies (2024)
- Industry Analysis Report by Global Insights
- Recent conference proceedings and white papers
- Expert interviews and case studies`,

  `# Deep Research Report

## Overview
This comprehensive analysis examines the subject matter through multiple lenses, synthesizing information from over 50 credible sources published within your specified timeframe.

## Methodology
Research approach included:
- Systematic literature review
- Quantitative data analysis
- Expert consultation
- Case study examination

## Core Findings

### Technical Analysis
The technical infrastructure has matured significantly. Performance benchmarks show:
- Processing speeds improved by 3.2x
- Error rates reduced to under 0.1%
- Scalability now supports 10M+ concurrent operations

### Economic Impact
Financial implications are substantial:
- Market size expanded to $47B globally
- Average ROI for adopters: 340% over 3 years
- Cost reductions averaging 28% across implementations

### Social Implications
Broader societal effects include:
- Job transformation affecting 2.3M positions
- New skill requirements emerging
- Accessibility improvements benefiting underserved communities

## Comparative Analysis
When compared against alternatives, the subject demonstrates:
- Superior performance in 7 out of 10 key metrics
- Better long-term sustainability profile
- Enhanced user satisfaction ratings (4.7/5.0)

## Recommendations
Based on findings:
1. Prioritize early adoption to maximize competitive advantage
2. Invest in training programs for workforce transition
3. Establish monitoring systems for ongoing assessment
4. Develop partnerships to share best practices

## Conclusion
The evidence strongly supports continued development and adoption, provided stakeholders address identified challenges proactively.`,
];

const mockGeminiResults = [
  `# Research Analysis Summary

## Introduction
This analysis provides a comprehensive overview based on your research parameters, drawing from recent academic literature, industry reports, and expert perspectives.

## Main Findings

### Trend Analysis
Current data reveals three primary trends:

1. **Accelerating Adoption**
   - Year-over-year growth of 67%
   - Expanding into new market segments
   - Geographic expansion across 45 countries

2. **Technology Evolution**
   - Next-generation capabilities emerging
   - Integration with complementary systems
   - Enhanced performance characteristics

3. **Ecosystem Development**
   - Robust developer community forming
   - Standards bodies establishing guidelines
   - Investment climate remains favorable

### Sector-Specific Insights

**Healthcare Applications:**
- Breakthrough use cases saving estimated 15K hours annually
- Patient outcomes improving by measurable margins
- Regulatory approval processes accelerating

**Financial Services:**
- Risk assessment capabilities enhanced
- Transaction processing speeds doubled
- Fraud detection accuracy at 99.2%

**Manufacturing:**
- Production efficiency gains of 34%
- Quality control improvements
- Supply chain optimization

## Comparative Landscape
Evaluation against competing approaches shows distinct advantages in:
- Cost-effectiveness (22% lower TCO)
- Implementation timeline (40% faster deployment)
- Maintenance requirements (reduced by half)

## Challenges Identified
Key obstacles include:
- Initial investment barriers
- Change management complexity
- Interoperability concerns

## Strategic Recommendations
Organizations should consider:
- Phased implementation approach
- Pilot programs to validate assumptions
- Stakeholder engagement strategies
- Continuous learning mechanisms

## Future Trajectory
Projections indicate sustained momentum with several inflection points expected between 2025-2028.

## Data Sources
Analysis based on 73 peer-reviewed studies, 28 industry reports, and 15 expert interviews conducted Q4 2024 - Q1 2025.`,

  `# Comprehensive Research Findings

## Research Scope
Conducted thorough investigation addressing your specified parameters with focus on recent developments and practical implications.

## Executive Overview
The subject area demonstrates robust growth and innovation, supported by strong fundamentals and increasing market confidence.

## Detailed Analysis

### Historical Context
Evolution over the past decade shows:
- Initial adoption phase (2015-2018): Experimental implementations
- Growth phase (2019-2022): Mainstream acceptance
- Maturity phase (2023-present): Optimization and refinement

### Current State Assessment

**Strengths:**
- Proven track record across diverse use cases
- Strong ecosystem support
- Continuous improvement trajectory
- Favorable economics

**Weaknesses:**
- Learning curve remains steep
- Integration complexity
- Legacy system compatibility
- Talent scarcity

**Opportunities:**
- Emerging markets showing high potential
- Adjacent applications being explored
- Strategic partnerships forming
- Policy environment improving

**Threats:**
- Competitive alternatives gaining traction
- Regulatory uncertainties
- Technology disruption risks
- Market saturation in mature segments

### Quantitative Insights
Data analysis reveals:
- Compound annual growth rate: 34%
- Market penetration: 23% in target segments
- User satisfaction: Consistently above 4.5/5
- Return on investment: Average 280% over 36 months

### Qualitative Factors
Expert consensus emphasizes:
- Long-term viability looks promising
- Short-term volatility expected
- Strategic patience recommended
- Continuous adaptation essential

## Implementation Considerations
Organizations planning adoption should evaluate:
1. Internal readiness and capability gaps
2. Resource allocation and budgeting
3. Timeline expectations and milestones
4. Risk mitigation strategies
5. Success metrics and KPIs

## Conclusion
Evidence supports cautiously optimistic outlook with recommendation for strategic engagement based on organizational context and risk tolerance.

## Methodology Note
Research synthesized from multiple authoritative sources including academic databases, industry publications, and primary research conducted with domain experts.`,
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock OpenAI refinement questions API
export async function mockGetRefinementQuestions(prompt: string): Promise<RefinementQuestion[]> {
  await delay(1000 + Math.random() * 1000); // 1-2 second delay

  // 70% chance of refinement questions, 30% chance of none
  if (Math.random() > 0.3) {
    const randomQuestions = mockRefinementQuestions[Math.floor(Math.random() * mockRefinementQuestions.length)];
    return randomQuestions;
  }

  return [];
}

// Mock OpenAI research API
export async function mockOpenAIResearch(refinedPrompt: string): Promise<string> {
  await delay(2000 + Math.random() * 2000); // 2-4 second delay

  const randomResult = mockOpenAIResults[Math.floor(Math.random() * mockOpenAIResults.length)];
  return randomResult;
}

// Mock Gemini research API
export async function mockGeminiResearch(refinedPrompt: string): Promise<string> {
  await delay(1500 + Math.random() * 2000); // 1.5-3.5 second delay

  const randomResult = mockGeminiResults[Math.floor(Math.random() * mockGeminiResults.length)];
  return randomResult;
}

// Combined mock research function (runs both in parallel)
export async function mockParallelResearch(refinedPrompt: string): Promise<{
  openaiResult: string;
  geminiResult: string;
}> {
  const [openaiResult, geminiResult] = await Promise.all([
    mockOpenAIResearch(refinedPrompt),
    mockGeminiResearch(refinedPrompt),
  ]);

  return { openaiResult, geminiResult };
}
