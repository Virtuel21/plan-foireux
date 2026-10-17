"""Original deterministic Foley-like synthesis; Python standard library only.
No samples, recordings, voices, or third-party sound libraries.
"""
import math, random, wave, struct, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','audio');os.makedirs(OUT,exist_ok=True)
PROFILES={
 'ui':(.09,740,450,.04),'confirm':(.2,420,900,.01),'deny':(.18,170,90,.08),
 'phase':(.4,330,660,.01),'drill':(.8,80,88,.3),'overheat':(.6,500,100,.6),
 'plug':(.12,280,130,.18),'current':(.35,120,460,.04),'lever':(.2,180,70,.25),
 'lock':(.17,950,350,.18),'coin':(.35,1800,2600,.02),'cloth':(.45,100,80,.8),
 'signal':(.5,740,1040,.03),'siren':(1.4,480,780,.03),'van':(1.1,80,150,.2),
 'arrest':(.65,130,45,.3),'ambience':(8,55,55,.025)
}
for index,(name,(duration,start,end,noise)) in enumerate(PROFILES.items()):
    rng=random.Random(index+143);rate=22050;values=[];phase=0
    for i in range(int(duration*rate)):
        t=i/rate;u=t/duration;f=start+(end-start)*u
        if name=='siren':f=630+150*math.sin(t*math.tau*1.7)
        if name=='signal':f=740 if int(t*12)%2 else 1040
        phase+=math.tau*f/rate
        tone=math.sin(phase)*.65+math.sin(phase*2)*.2+math.sin(phase*3)*.1
        amplitude=min(1,t/.012)*min(1,(duration-t)/.06)*(1 if name in ['drill','ambience','van','siren'] else (1-u)**1.7)
        if name=='ambience':amplitude=.08 # seamless constant-frequency room tone
        sample=((1-noise)*tone+noise*(rng.random()*2-1))*.32*amplitude
        values.append(struct.pack('<h',max(-32767,min(32767,int(sample*32767)))))
    with wave.open(os.path.join(OUT,name+'.wav'),'wb') as output:
        output.setnchannels(1);output.setsampwidth(2);output.setframerate(rate);output.writeframes(b''.join(values))
print('EXPORTED',len(PROFILES),'original synthesized sounds')
