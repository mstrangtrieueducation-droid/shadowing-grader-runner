// Provider-constrained arrays avoid asking a model to count hundreds of repeated
// characters in a single string. Joining them later changes representation only.
export function structuredShadowCoverage(schema,template){
 const out=structuredClone(schema);
 for(const name of ['units','prosody','fluency']){const count=template?.[name]?.length;if(!count)throw Error('SHADOW_COVERAGE_TARGETS_MISSING');out.properties.scoreLedger.properties[name].properties.outcomes={type:'array',items:{type:'string',enum:['C','I','M','U']},minItems:count,maxItems:count,description:'Exactly '+count+' single-character acoustic verdicts, one per supplied target in order. No omitted targets.'};}
 out.properties.scoreLedger.properties.phraseChecks.minItems=template.prosody.length;out.properties.scoreLedger.properties.phraseChecks.maxItems=template.prosody.length;return out;
}
export function normalizeCoverageArrays(text){
 let g;try{g=JSON.parse(text);}catch{return text;}let changed=false;
 for(const name of ['units','prosody','fluency']){const block=g.scoreLedger?.[name];if(Array.isArray(block?.outcomes)&&block.outcomes.every(v=>typeof v==='string'&&/^[CIMU]$/.test(v))){block.outcomes=block.outcomes.join('');changed=true;}}
 return changed?JSON.stringify(g):text;
}
