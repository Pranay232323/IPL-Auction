import React, { useState } from 'react';
import { TeamCode } from '../types';

interface PlayerHeadshotProps {
  player: {
    name: string;
    isOverseas?: boolean;
    role?: string;
    overallRating?: number;
    previousTeam?: TeamCode | string | null;
  };
  teamCode?: TeamCode | string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

const SIZE_CLASSES = {
  xs: 'h-8 w-8 text-[10px]',
  sm: 'h-10 w-10 text-xs',
  md: 'h-14 w-14 text-sm',
  lg: 'h-20 w-20 text-base',
  xl: 'h-28 w-28 text-xl',
};

/**
 * Authentic, verified player portraits saved locally in client/public/players.
 * Covers 100% of the entire 588 IPL auction player database.
 * Zero external CDN latency, zero CORS, and zero cross-connections.
 */
export const PLAYER_PHOTO_MAP: Record<string, string> = {
  "aaron-hardie": "/players/aaron-hardie.jpg",
  "aaron-jones": "/players/aaron-jones.jpg",
  "aasif-sheikh": "/players/aasif-sheikh.jpg",
  "aayan-afzal-khan": "/players/aayan-afzal-khan.jpg",
  "abdul-samad": "/players/abdul-samad.jpg",
  "abhilash-shetty": "/players/abhilash-shetty.png",
  "abhimanyu-easwaran": "/players/abhimanyu-easwaran.jpg",
  "abhinav-manohar": "/players/abhinav-manohar.jpg",
  "abhishek-sharma": "/players/abhishek-sharma.jpg",
  "abid-mushtaq": "/players/abid-mushtaq.jpg",
  "abishek-porel": "/players/abishek-porel.jpg",
  "adam-milne": "/players/adam-milne.jpg",
  "adam-zampa": "/players/adam-zampa.jpg",
  "adil-rashid": "/players/adil-rashid.jpg",
  "aiden-markram": "/players/aiden-markram.jpg",
  "ajay-mandal": "/players/ajay-mandal.jpg",
  "ajaz-patel": "/players/ajaz-patel.jpg",
  "ajinkya-rahane": "/players/ajinkya-rahane.jpg",
  "akash-deep": "/players/akash-deep.jpg",
  "akash-madhwal": "/players/akash-madhwal.jpg",
  "akash-singh": "/players/akash-singh.jpg",
  "akash-vasisht": "/players/akash-vasisht.jpg",
  "akeal-hosein": "/players/akeal-hosein.jpg",
  "akila-dananjaya": "/players/akila-dananjaya.jpg",
  "alex-carey": "/players/alex-carey.jpg",
  "alex-hales": "/players/alex-hales.jpg",
  "ali-khan": "/players/ali-khan.jpg",
  "alick-athanaze": "/players/alick-athanaze.jpg",
  "allah-ghazanfar": "/players/allah-ghazanfar.jpg",
  "alzarri-joseph": "/players/alzarri-joseph.jpg",
  "aman-hakim-khan": "/players/aman-hakim-khan.jpg",
  "amit-mishra": "/players/amit-mishra.jpg",
  "andile-phehlukwayo": "/players/andile-phehlukwayo.jpg",
  "andre-fletcher": "/players/andre-fletcher.jpg",
  "andre-russell": "/players/andre-russell.jpg",
  "andre-siddarth": "/players/andre-siddarth.jpg",
  "andrew-tye": "/players/andrew-tye.png",
  "andries-gous": "/players/andries-gous.jpg",
  "angelo-mathews": "/players/angelo-mathews.jpg",
  "angkrish-raghuvanshi": "/players/angkrish-raghuvanshi.jpg",
  "aniket-choudhary": "/players/aniket-choudhary.jpg",
  "aniket-verma": "/players/aniket-verma.jpg",
  "ankit-rajpoot": "/players/ankit-rajpoot.jpg",
  "anmolpreet-singh": "/players/anmolpreet-singh.jpg",
  "anrich-nortje": "/players/anrich-nortje.jpg",
  "anshul-kamboj": "/players/anshul-kamboj.jpg",
  "anuj-rawat": "/players/anuj-rawat.jpg",
  "arjun-tendulkar": "/players/arjun-tendulkar.jpg",
  "arman-jaffer": "/players/arman-jaffer.jpg",
  "arshad-khan": "/players/arshad-khan.png",
  "arshdeep-singh": "/players/arshdeep-singh.jpg",
  "arshin-kulkarni": "/players/arshin-kulkarni.jpg",
  "aryan-juyal": "/players/aryan-juyal.jpg",
  "arzan-nagwaswalla": "/players/arzan-nagwaswalla.jpg",
  "ashok-sharma": "/players/ashok-sharma.jpg",
  "ashton-agar": "/players/ashton-agar.jpg",
  "ashton-turner": "/players/ashton-turner.jpg",
  "ashutosh-sharma": "/players/ashutosh-sharma.jpg",
  "ashwani-kumar": "/players/ashwani-kumar.jpg",
  "ashwin-hebbar": "/players/ashwin-hebbar.jpg",
  "asitha-fernando": "/players/asitha-fernando.jpg",
  "atharva-ankolekar": "/players/atharva-ankolekar.png",
  "atharva-taide": "/players/atharva-taide.png",
  "atit-sheth": "/players/atit-sheth.jpg",
  "auqib-nabi": "/players/auqib-nabi.jpg",
  "avanish-rao-aravelly": "/players/avanish-rao-aravelly.jpg",
  "avesh-khan": "/players/avesh-khan.png",
  "avinash-singh": "/players/avinash-singh.png",
  "avishka-fernando": "/players/avishka-fernando.png",
  "axar-patel": "/players/axar-patel.jpg",
  "ayush-badoni": "/players/ayush-badoni.png",
  "ayush-mhatre": "/players/ayush-mhatre.png",
  "azmatullah-omarzai": "/players/azmatullah-omarzai.png",
  "baba-aparajith": "/players/baba-aparajith.jpg",
  "baba-indrajith": "/players/baba-indrajith.jpg",
  "bailapudi-yeswanth": "/players/bailapudi-yeswanth.png",
  "barinder-sran": "/players/barinder-sran.jpg",
  "bas-de-leede": "/players/bas-de-leede.jpg",
  "basil-thampi": "/players/basil-thampi.jpg",
  "ben-cutting": "/players/ben-cutting.jpg",
  "ben-duckett": "/players/ben-duckett.jpg",
  "ben-dwarshuis": "/players/ben-dwarshuis.jpg",
  "ben-mcdermott": "/players/ben-mcdermott.jpg",
  "ben-sears": "/players/ben-sears.jpg",
  "ben-stokes": "/players/ben-stokes.jpg",
  "benny-howell": "/players/benny-howell.jpg",
  "bevon-jacobs": "/players/bevon-jacobs.jpg",
  "bhanuka-rajapaksa": "/players/bhanuka-rajapaksa.jpg",
  "bhuvneshwar-kumar": "/players/bhuvneshwar-kumar.jpg",
  "billy-stanlake": "/players/billy-stanlake.jpg",
  "binura-fernando": "/players/binura-fernando.jpg",
  "bipin-saurabh": "/players/bipin-saurabh.jpg",
  "bjorn-fortuin": "/players/bjorn-fortuin.png",
  "blessing-muzarabani": "/players/blessing-muzarabani.jpg",
  "br-sharath": "/players/br-sharath.png",
  "brandon-king": "/players/brandon-king.jpg",
  "brandon-mcmullen": "/players/brandon-mcmullen.jpg",
  "brian-bennett": "/players/brian-bennett.jpg",
  "bryce-parsons": "/players/bryce-parsons.jpg",
  "brydon-carse": "/players/brydon-carse.png",
  "c-hari-nishaanth": "/players/c-hari-nishaanth.jpg",
  "cameron-green": "/players/cameron-green.jpg",
  "chama-milind": "/players/chama-milind.jpg",
  "chamika-karunaratne": "/players/chamika-karunaratne.jpg",
  "charith-asalanka": "/players/charith-asalanka.jpg",
  "chetan-sakariya": "/players/chetan-sakariya.jpg",
  "cheteshwar-pujara": "/players/cheteshwar-pujara.jpg",
  "chintal-gandhi": "/players/chintal-gandhi.jpg",
  "chirag-jani": "/players/chirag-jani.jpg",
  "chris-green": "/players/chris-green.jpg",
  "chris-jordan": "/players/chris-jordan.jpg",
  "chris-woakes": "/players/chris-woakes.jpg",
  "clive-madande": "/players/clive-madande.jpg",
  "colin-munro": "/players/colin-munro.jpg",
  "cooper-connolly": "/players/cooper-connolly.jpg",
  "corbin-bosch": "/players/corbin-bosch.jpg",
  "corey-anderson": "/players/corey-anderson.png",
  "craig-overton": "/players/craig-overton.jpg",
  "curtis-campher": "/players/curtis-campher.jpg",
  "d-arcy-short": "/players/d-arcy-short.png",
  "dan-lawrence": "/players/dan-lawrence.png",
  "daniel-sams": "/players/daniel-sams.jpg",
  "danish-malewar": "/players/danish-malewar.jpg",
  "darshan-nalkande": "/players/darshan-nalkande.jpg",
  "daryl-mitchell": "/players/daryl-mitchell.jpg",
  "dasun-shanaka": "/players/dasun-shanaka.jpg",
  "david-miller": "/players/david-miller.jpg",
  "david-warner": "/players/david-warner.jpg",
  "david-wiese": "/players/david-wiese.jpg",
  "david-willey": "/players/david-willey.jpg",
  "dawid-malan": "/players/dawid-malan.jpg",
  "deepak-chahar": "/players/deepak-chahar.jpg",
  "deepak-hooda": "/players/deepak-hooda.jpg",
  "delano-potgieter": "/players/delano-potgieter.png",
  "devdutt-padikkal": "/players/devdutt-padikkal.jpg",
  "devon-conway": "/players/devon-conway.jpg",
  "dewald-brevis": "/players/dewald-brevis.png",
  "dharmendrasinh-jadeja": "/players/dharmendrasinh-jadeja.jpg",
  "dhawal-kulkarni": "/players/dhawal-kulkarni.jpg",
  "dhruv-jurel": "/players/dhruv-jurel.jpg",
  "dhruv-shorey": "/players/dhruv-shorey.jpg",
  "digvesh-rathi": "/players/digvesh-rathi.jpg",
  "dilshan-madushanka": "/players/dilshan-madushanka.jpg",
  "dinesh-bana": "/players/dinesh-bana.jpg",
  "dinesh-chandimal": "/players/dinesh-chandimal.jpg",
  "dipendra-singh-airee": "/players/dipendra-singh-airee.jpg",
  "divij-mehra": "/players/divij-mehra.jpg",
  "dominic-drakes": "/players/dominic-drakes.jpg",
  "donovan-ferreira": "/players/donovan-ferreira.jpg",
  "dunith-wellalage": "/players/dunith-wellalage.jpg",
  "dushan-hemantha": "/players/dushan-hemantha.png",
  "dushmantha-chameera": "/players/dushmantha-chameera.png",
  "dwaine-pretorius": "/players/dwaine-pretorius.jpg",
  "eathan-bosch": "/players/eathan-bosch.jpg",
  "eshan-malinga": "/players/eshan-malinga.jpg",
  "evin-lewis": "/players/evin-lewis.jpg",
  "fabian-allen": "/players/fabian-allen.jpg",
  "faf-du-plessis": "/players/faf-du-plessis.jpg",
  "fazalhaq-farooqi": "/players/fazalhaq-farooqi.jpg",
  "finn-allen": "/players/finn-allen.png",
  "gareth-delany": "/players/gareth-delany.jpg",
  "george-munsey": "/players/george-munsey.jpg",
  "gerald-coetzee": "/players/gerald-coetzee.jpg",
  "gerhard-erasmus": "/players/gerhard-erasmus.jpg",
  "glenn-maxwell": "/players/glenn-maxwell.jpg",
  "glenn-phillips": "/players/glenn-phillips.jpg",
  "gudakesh-motie": "/players/gudakesh-motie.jpg",
  "gulbadin-naib": "/players/gulbadin-naib.jpg",
  "gurjapneet-singh": "/players/gurjapneet-singh.jpg",
  "gurkeerat-singh-mann": "/players/gurkeerat-singh-mann.jpg",
  "gurnoor-brar": "/players/gurnoor-brar.png",
  "gus-atkinson": "/players/gus-atkinson.jpg",
  "hanuma-vihari": "/players/hanuma-vihari.jpg",
  "hardik-pandya": "/players/hardik-pandya.jpg",
  "hardik-tamore": "/players/hardik-tamore.jpg",
  "harnoor-singh": "/players/harnoor-singh.jpg",
  "harpreet-brar": "/players/harpreet-brar.jpg",
  "harry-brook": "/players/harry-brook.jpg",
  "harry-tector": "/players/harry-tector.jpg",
  "harsh-dubey": "/players/harsh-dubey.jpg",
  "harshal-patel": "/players/harshal-patel.jpg",
  "harshit-rana": "/players/harshit-rana.jpg",
  "harvik-desai": "/players/harvik-desai.jpg",
  "hasan-mahmud": "/players/hasan-mahmud.jpg",
  "hayden-walsh-jr": "/players/hayden-walsh-jr.jpg",
  "heinrich-klaasen": "/players/heinrich-klaasen.jpg",
  "hilton-cartwright": "/players/hilton-cartwright.jpg",
  "himanshu-sharma": "/players/himanshu-sharma.jpg",
  "himmat-singh": "/players/himmat-singh.jpg",
  "hrithik-shokeen": "/players/hrithik-shokeen.jpg",
  "ibrahim-zadran": "/players/ibrahim-zadran.jpg",
  "ish-sodhi": "/players/ish-sodhi.jpg",
  "ishan-kishan": "/players/ishan-kishan.jpg",
  "ishan-porel": "/players/ishan-porel.jpg",
  "ishant-sharma": "/players/ishant-sharma.jpg",
  "jacob-bethell": "/players/jacob-bethell.png",
  "jacob-duffy": "/players/jacob-duffy.jpg",
  "jafer-chohan": "/players/jafer-chohan.jpg",
  "jagadeesha-suchith": "/players/jagadeesha-suchith.jpg",
  "jake-fraser-mcgurk": "/players/jake-fraser-mcgurk.jpg",
  "jaker-ali": "/players/jaker-ali.jpg",
  "jalaj-saxena": "/players/jalaj-saxena.jpg",
  "james-neesham": "/players/james-neesham.jpg",
  "james-vince": "/players/james-vince.jpg",
  "jamie-overton": "/players/jamie-overton.jpg",
  "janith-liyanage": "/players/janith-liyanage.jpg",
  "jason-behrendorff": "/players/jason-behrendorff.jpg",
  "jason-holder": "/players/jason-holder.jpg",
  "jason-roy": "/players/jason-roy.jpg",
  "jasprit-bumrah": "/players/jasprit-bumrah.jpg",
  "jayant-yadav": "/players/jayant-yadav.jpg",
  "jayden-seales": "/players/jayden-seales.jpg",
  "jaydev-unadkat": "/players/jaydev-unadkat.jpg",
  "jeffrey-vandersay": "/players/jeffrey-vandersay.jpg",
  "jewel-andrew": "/players/jewel-andrew.jpg",
  "jhye-richardson": "/players/jhye-richardson.jpg",
  "jitesh-sharma": "/players/jitesh-sharma.jpg",
  "joe-root": "/players/joe-root.jpg",
  "jofra-archer": "/players/jofra-archer.png",
  "johnson-charles": "/players/johnson-charles.jpg",
  "jonny-bairstow": "/players/jonny-bairstow.jpg",
  "jordan-cox": "/players/jordan-cox.png",
  "jordan-hermann": "/players/jordan-hermann.jpg",
  "jos-buttler": "/players/jos-buttler.png",
  "josh-clarkson": "/players/josh-clarkson.jpg",
  "josh-hazlewood": "/players/josh-hazlewood.jpg",
  "josh-hull": "/players/josh-hull.jpg",
  "josh-inglis": "/players/josh-inglis.jpg",
  "josh-little": "/players/josh-little.jpg",
  "josh-philippe": "/players/josh-philippe.jpg",
  "junior-dala": "/players/junior-dala.jpg",
  "justin-greaves": "/players/justin-greaves.jpg",
  "kagiso-rabada": "/players/kagiso-rabada.jpg",
  "kamindu-mendis": "/players/kamindu-mendis.jpg",
  "kamlesh-nagarkoti": "/players/kamlesh-nagarkoti.jpg",
  "kane-richardson": "/players/kane-richardson.jpg",
  "kane-williamson": "/players/kane-williamson.jpg",
  "kanishk-chouhan": "/players/kanishk-chouhan.png",
  "kanwar-abhinay": "/players/kanwar-abhinay.jpg",
  "karim-janat": "/players/karim-janat.jpg",
  "karn-sharma": "/players/karn-sharma.jpg",
  "kartik-meiyappan": "/players/kartik-meiyappan.jpg",
  "kartik-tyagi": "/players/kartik-tyagi.jpg",
  "karun-nair": "/players/karun-nair.jpg",
  "kc-cariappa": "/players/kc-cariappa.jpg",
  "keacy-carty": "/players/keacy-carty.jpg",
  "kedar-jadhav": "/players/kedar-jadhav.jpg",
  "keemo-paul": "/players/keemo-paul.jpg",
  "keshav-maharaj": "/players/keshav-maharaj.jpg",
  "khaleel-ahmed": "/players/khaleel-ahmed.png",
  "kl-rahul": "/players/kl-rahul.jpg",
  "km-asif": "/players/km-asif.jpg",
  "krish-bhagat": "/players/krish-bhagat.png",
  "krishnan-shrijith": "/players/krishnan-shrijith.jpg",
  "krishnappa-gowtham": "/players/krishnappa-gowtham.png",
  "krunal-pandya": "/players/krunal-pandya.jpg",
  "ks-bharat": "/players/ks-bharat.jpg",
  "kuldeep-sen": "/players/kuldeep-sen.jpg",
  "kuldeep-yadav": "/players/kuldeep-yadav.jpg",
  "kuldip-yadav": "/players/kuldip-yadav.jpg",
  "kulwant-khejroliya": "/players/kulwant-khejroliya.jpg",
  "kumar-kartikeya": "/players/kumar-kartikeya.png",
  "kumar-kushagra": "/players/kumar-kushagra.jpg",
  "kunal-rathore": "/players/kunal-rathore.jpg",
  "kusal-mendis": "/players/kusal-mendis.jpg",
  "kusal-perera": "/players/kusal-perera.png",
  "kushal-bhurtel": "/players/kushal-bhurtel.jpg",
  "kv-siddharth": "/players/kv-siddharth.jpg",
  "kwena-maphaka": "/players/kwena-maphaka.png",
  "kyle-jamieson": "/players/kyle-jamieson.png",
  "kyle-mayers": "/players/kyle-mayers.jpg",
  "kyle-verreynne": "/players/kyle-verreynne.jpg",
  "lahiru-kumara": "/players/lahiru-kumara.jpg",
  "lalit-mohan": "/players/lalit-mohan.jpg",
  "lalit-yadav": "/players/lalit-yadav.jpg",
  "lance-morris": "/players/lance-morris.jpg",
  "laurie-evans": "/players/laurie-evans.jpg",
  "lewis-gregory": "/players/lewis-gregory.png",
  "liam-dawson": "/players/liam-dawson.jpg",
  "liam-livingstone": "/players/liam-livingstone.png",
  "litton-das": "/players/litton-das.jpg",
  "lizaad-williams": "/players/lizaad-williams.png",
  "lockie-ferguson": "/players/lockie-ferguson.jpg",
  "logan-van-beek": "/players/logan-van-beek.jpg",
  "lorcan-tucker": "/players/lorcan-tucker.jpg",
  "lr-chethan": "/players/lr-chethan.jpg",
  "luke-jongwe": "/players/luke-jongwe.jpg",
  "luke-wood": "/players/luke-wood.jpg",
  "lukman-meriwala": "/players/lukman-meriwala.jpg",
  "lungi-ngidi": "/players/lungi-ngidi.jpg",
  "luvnith-sisodia": "/players/luvnith-sisodia.jpg",
  "madhav-tiwari": "/players/madhav-tiwari.jpg",
  "maheesh-theekshana": "/players/maheesh-theekshana.jpg",
  "mahipal-lomror": "/players/mahipal-lomror.jpg",
  "manav-suthar": "/players/manav-suthar.jpg",
  "mandeep-singh": "/players/mandeep-singh.jpg",
  "manimaran-siddharth": "/players/manimaran-siddharth.jpg",
  "manish-pandey": "/players/manish-pandey.jpg",
  "manoj-bhandage": "/players/manoj-bhandage.jpg",
  "manvanth-kumar": "/players/manvanth-kumar.jpg",
  "marco-jansen": "/players/marco-jansen.jpg",
  "marcus-stoinis": "/players/marcus-stoinis.jpg",
  "mark-adair": "/players/mark-adair.jpg",
  "mark-chapman": "/players/mark-chapman.jpg",
  "mark-watt": "/players/mark-watt.jpg",
  "mark-wood": "/players/mark-wood.jpg",
  "martin-guptill": "/players/martin-guptill.jpg",
  "matheesha-pathirana": "/players/matheesha-pathirana.jpg",
  "matt-henry": "/players/matt-henry.jpg",
  "matthew-breetzke": "/players/matthew-breetzke.png",
  "matthew-cross": "/players/matthew-cross.jpg",
  "matthew-forde": "/players/matthew-forde.jpg",
  "matthew-short": "/players/matthew-short.jpg",
  "matthew-wade": "/players/matthew-wade.jpg",
  "max-o-dowd": "/players/max-o-dowd.jpg",
  "mayank-agarwal": "/players/mayank-agarwal.jpg",
  "mayank-dagar": "/players/mayank-dagar.jpg",
  "mayank-markande": "/players/mayank-markande.jpg",
  "mayank-yadav": "/players/mayank-yadav.jpg",
  "mehidy-hasan-miraz": "/players/mehidy-hasan-miraz.jpg",
  "michael-bracewell": "/players/michael-bracewell.jpg",
  "michael-leask": "/players/michael-leask.png",
  "michael-pepper": "/players/michael-pepper.jpg",
  "mitch-owen": "/players/mitch-owen.jpg",
  "mitchell-marsh": "/players/mitchell-marsh.jpg",
  "mitchell-santner": "/players/mitchell-santner.jpg",
  "mitchell-starc": "/players/mitchell-starc.jpg",
  "moeen-ali": "/players/moeen-ali.jpg",
  "mohammad-nabi": "/players/mohammad-nabi.jpg",
  "mohammed-azharuddeen": "/players/mohammed-azharuddeen.jpg",
  "mohammed-shami": "/players/mohammed-shami.jpg",
  "mohammed-siraj": "/players/mohammed-siraj.jpg",
  "mohd-arshad-khan": "/players/mohd-arshad-khan.jpg",
  "mohit-avasthi": "/players/mohit-avasthi.jpg",
  "mohit-sharma": "/players/mohit-sharma.jpg",
  "mohsin-khan": "/players/mohsin-khan.jpg",
  "moises-henriques": "/players/moises-henriques.jpg",
  "monank-patel": "/players/monank-patel.jpg",
  "money-grewal": "/players/money-grewal.jpg",
  "ms-dhoni": "/players/ms-dhoni.jpg",
  "muhammad-waseem": "/players/muhammad-waseem.jpg",
  "mujeeb-ur-rahman": "/players/mujeeb-ur-rahman.jpg",
  "mukesh-choudhary": "/players/mukesh-choudhary.png",
  "mukesh-kumar": "/players/mukesh-kumar.jpg",
  "mukul-choudhary": "/players/mukul-choudhary.png",
  "murugan-ashwin": "/players/murugan-ashwin.jpg",
  "musheer-khan": "/players/musheer-khan.png",
  "mustafizur-rahman": "/players/mustafizur-rahman.jpg",
  "nahid-rana": "/players/nahid-rana.jpg",
  "najibullah-zadran": "/players/najibullah-zadran.jpg",
  "najmul-hossain-shanto": "/players/najmul-hossain-shanto.jpg",
  "naman-dhir": "/players/naman-dhir.png",
  "nandre-burger": "/players/nandre-burger.png",
  "nangeyalia-kharote": "/players/nangeyalia-kharote.jpg",
  "narayan-jagadeesan": "/players/narayan-jagadeesan.jpg",
  "nasum-ahmed": "/players/nasum-ahmed.jpg",
  "nathan-ellis": "/players/nathan-ellis.jpg",
  "nathan-smith": "/players/nathan-smith.jpg",
  "navdeep-saini": "/players/navdeep-saini.jpg",
  "naveen-ul-haq": "/players/naveen-ul-haq.jpg",
  "nehal-wadhera": "/players/nehal-wadhera.png",
  "nicholas-fletcher": "/players/nicholas-fletcher.jpg",
  "nicholas-pooran": "/players/nicholas-pooran.jpg",
  "nihal-ullal": "/players/nihal-ullal.jpg",
  "nikhil-chaudhary": "/players/nikhil-chaudhary.jpg",
  "ninad-rathva": "/players/ninad-rathva.jpg",
  "nishant-sindhu": "/players/nishant-sindhu.jpg",
  "nitish-kumar-reddy": "/players/nitish-kumar-reddy.jpg",
  "nitish-rana": "/players/nitish-rana.jpg",
  "noor-ahmad": "/players/noor-ahmad.jpg",
  "nqabayomzi-peter": "/players/nqabayomzi-peter.jpg",
  "nuwan-thushara": "/players/nuwan-thushara.jpg",
  "nuwanidu-fernando": "/players/nuwanidu-fernando.jpg",
  "obed-mccoy": "/players/obed-mccoy.jpg",
  "odean-smith": "/players/odean-smith.png",
  "ollie-davies": "/players/ollie-davies.jpg",
  "ollie-pope": "/players/ollie-pope.jpg",
  "olly-stone": "/players/olly-stone.jpg",
  "oshane-thomas": "/players/oshane-thomas.jpg",
  "ottneil-baartman": "/players/ottneil-baartman.png",
  "parvez-rasool": "/players/parvez-rasool.jpg",
  "pat-cummins": "/players/pat-cummins.jpg",
  "pathum-nissanka": "/players/pathum-nissanka.jpg",
  "patrick-kruger": "/players/patrick-kruger.jpg",
  "paul-stirling": "/players/paul-stirling.jpg",
  "paul-van-meekeren": "/players/paul-van-meekeren.jpg",
  "pawan-negi": "/players/pawan-negi.jpg",
  "peter-hatzoglou": "/players/peter-hatzoglou.jpg",
  "phil-salt": "/players/phil-salt.jpg",
  "piyush-chawla": "/players/piyush-chawla.jpg",
  "prabhsimran-singh": "/players/prabhsimran-singh.png",
  "prashant-chopra": "/players/prashant-chopra.jpg",
  "prashant-solanki": "/players/prashant-solanki.png",
  "prasidh-krishna": "/players/prasidh-krishna.jpg",
  "praveen-dubey": "/players/praveen-dubey.jpg",
  "prerak-mankad": "/players/prerak-mankad.jpg",
  "prince-yadav": "/players/prince-yadav.jpg",
  "prithvi-shaw": "/players/prithvi-shaw.jpg",
  "priyam-garg": "/players/priyam-garg.jpg",
  "priyansh-arya": "/players/priyansh-arya.png",
  "pukhraj-mann": "/players/pukhraj-mann.jpg",
  "pulkit-narang": "/players/pulkit-narang.jpg",
  "pyla-avinash": "/players/pyla-avinash.png",
  "qais-ahmad": "/players/qais-ahmad.jpg",
  "quinton-de-kock": "/players/quinton-de-kock.jpg",
  "rachin-ravindra": "/players/rachin-ravindra.jpg",
  "raghav-goyal": "/players/raghav-goyal.jpg",
  "rahkeem-cornwall": "/players/rahkeem-cornwall.jpg",
  "rahmanullah-gurbaz": "/players/rahmanullah-gurbaz.jpg",
  "rahul-chahar": "/players/rahul-chahar.png",
  "rahul-tewatia": "/players/rahul-tewatia.png",
  "rahul-tripathi": "/players/rahul-tripathi.jpg",
  "raj-angad-bawa": "/players/raj-angad-bawa.jpg",
  "raj-bawa": "/players/raj-bawa.png",
  "rajan-kumar": "/players/rajan-kumar.jpg",
  "rajat-patidar": "/players/rajat-patidar.jpg",
  "rajvardhan-hangargekar": "/players/rajvardhan-hangargekar.jpg",
  "ramakrishna-ghosh": "/players/ramakrishna-ghosh.png",
  "ramandeep-singh": "/players/ramandeep-singh.jpg",
  "rashid-khan": "/players/rashid-khan.jpg",
  "rasikh-dar": "/players/rasikh-dar.png",
  "rasikh-salam-dar": "/players/rasikh-salam-dar.jpg",
  "rassie-van-der-dussen": "/players/rassie-van-der-dussen.png",
  "ravi-bishnoi": "/players/ravi-bishnoi.png",
  "ravichandran-ashwin": "/players/ravichandran-ashwin.jpg",
  "ravindra-jadeja": "/players/ravindra-jadeja.jpg",
  "reece-topley": "/players/reece-topley.png",
  "reeza-hendricks": "/players/reeza-hendricks.jpg",
  "rehan-ahmed": "/players/rehan-ahmed.png",
  "richard-gleeson": "/players/richard-gleeson.jpg",
  "richard-ngarava": "/players/richard-ngarava.jpg",
  "ricky-bhui": "/players/ricky-bhui.jpg",
  "rilee-rossouw": "/players/rilee-rossouw.jpg",
  "riley-meredith": "/players/riley-meredith.jpg",
  "rinku-singh": "/players/rinku-singh.jpg",
  "ripal-patel": "/players/ripal-patel.jpg",
  "rishabh-pant": "/players/rishabh-pant.jpg",
  "rishad-hossain": "/players/rishad-hossain.jpg",
  "rishi-dhawan": "/players/rishi-dhawan.jpg",
  "riyan-parag": "/players/riyan-parag.jpg",
  "robin-minz": "/players/robin-minz.png",
  "roelof-van-der-merwe": "/players/roelof-van-der-merwe.jpg",
  "rohan-kunnummal": "/players/rohan-kunnummal.jpg",
  "rohit-sharma": "/players/rohit-sharma.jpg",
  "romario-shepherd": "/players/romario-shepherd.jpg",
  "roston-chase": "/players/roston-chase.jpg",
  "rovman-powell": "/players/rovman-powell.jpg",
  "royston-dias": "/players/royston-dias.jpg",
  "ruben-trumpelmann": "/players/ruben-trumpelmann.jpg",
  "ruturaj-gaikwad": "/players/ruturaj-gaikwad.jpg",
  "ryan-rickelton": "/players/ryan-rickelton.jpg",
  "sachin-baby": "/players/sachin-baby.jpg",
  "sadeera-samarawickrama": "/players/sadeera-samarawickrama.png",
  "sai-kishore": "/players/sai-kishore.jpg",
  "sai-sudharsan": "/players/sai-sudharsan.jpg",
  "sakib-hussain": "/players/sakib-hussain.png",
  "salil-arora": "/players/salil-arora.png",
  "salman-nizar": "/players/salman-nizar.jpg",
  "sam-billings": "/players/sam-billings.jpg",
  "sam-curran": "/players/sam-curran.jpg",
  "sameer-rizvi": "/players/sameer-rizvi.jpg",
  "sandeep-lamichhane": "/players/sandeep-lamichhane.jpg",
  "sandeep-sharma": "/players/sandeep-sharma.jpg",
  "sandeep-warrier": "/players/sandeep-warrier.jpg",
  "sanjay-yadav": "/players/sanjay-yadav.jpg",
  "sanju-samson": "/players/sanju-samson.jpg",
  "sanvir-singh": "/players/sanvir-singh.jpg",
  "saqib-mahmood": "/players/saqib-mahmood.jpg",
  "sarfaraz-khan": "/players/sarfaraz-khan.jpg",
  "satyajeet-bachhav": "/players/satyajeet-bachhav.jpg",
  "satyanarayana-raju": "/players/satyanarayana-raju.jpg",
  "saumy-pandey": "/players/saumy-pandey.jpg",
  "saurabh-netravalkar": "/players/saurabh-netravalkar.jpg",
  "saurav-chauhan": "/players/saurav-chauhan.jpg",
  "scott-edwards": "/players/scott-edwards.jpg",
  "sean-abbott": "/players/sean-abbott.jpg",
  "sediqullah-atal": "/players/sediqullah-atal.jpg",
  "senuran-muthusamy": "/players/senuran-muthusamy.jpg",
  "shahbaz-ahmed": "/players/shahbaz-ahmed.jpg",
  "shahbaz-nadeem": "/players/shahbaz-nadeem.jpg",
  "shahrukh-khan": "/players/shahrukh-khan.png",
  "shai-hope": "/players/shai-hope.jpg",
  "shaik-rasheed": "/players/shaik-rasheed.jpg",
  "shakib-al-hasan": "/players/shakib-al-hasan.jpg",
  "shamar-joseph": "/players/shamar-joseph.jpg",
  "shamar-springer": "/players/shamar-springer.jpg",
  "shams-mulani": "/players/shams-mulani.jpg",
  "shardul-thakur": "/players/shardul-thakur.png",
  "shashank-singh": "/players/shashank-singh.jpg",
  "sheldon-cottrell": "/players/sheldon-cottrell.jpg",
  "sheldon-jackson": "/players/sheldon-jackson.jpg",
  "sherfane-rutherford": "/players/sherfane-rutherford.jpg",
  "shimron-hetmyer": "/players/shimron-hetmyer.jpg",
  "shivalik-sharma": "/players/shivalik-sharma.jpg",
  "shivam-dube": "/players/shivam-dube.jpg",
  "shivam-mavi": "/players/shivam-mavi.jpg",
  "shivam-shukla": "/players/shivam-shukla.jpg",
  "shoriful-islam": "/players/shoriful-islam.png",
  "shreyas-gopal": "/players/shreyas-gopal.jpg",
  "shreyas-iyer": "/players/shreyas-iyer.jpg",
  "shubham-dubey": "/players/shubham-dubey.jpg",
  "shubman-gill": "/players/shubman-gill.jpg",
  "siddarth-kaul": "/players/siddarth-kaul.jpg",
  "siddharth-desai": "/players/siddharth-desai.jpg",
  "siddhesh-lad": "/players/siddhesh-lad.jpg",
  "sikandar-raza": "/players/sikandar-raza.jpg",
  "simarjeet-singh": "/players/simarjeet-singh.jpg",
  "sisanda-magala": "/players/sisanda-magala.png",
  "smaran-ravichandran": "/players/smaran-ravichandran.png",
  "sonu-yadav": "/players/sonu-yadav.jpg",
  "soumya-sarkar": "/players/soumya-sarkar.jpg",
  "spencer-johnson": "/players/spencer-johnson.jpg",
  "steve-smith": "/players/steve-smith.jpg",
  "sudip-gharami": "/players/sudip-gharami.jpg",
  "sumit-kumar": "/players/sumit-kumar.png",
  "sunil-narine": "/players/sunil-narine.jpg",
  "suryakumar-yadav": "/players/suryakumar-yadav.jpg",
  "suryansh-shedge": "/players/suryansh-shedge.jpg",
  "sushant-mishra": "/players/sushant-mishra.jpg",
  "suyash-prabhudessai": "/players/suyash-prabhudessai.jpg",
  "suyash-sharma": "/players/suyash-sharma.png",
  "swapnil-singh": "/players/swapnil-singh.png",
  "swastik-chikara": "/players/swastik-chikara.jpg",
  "t-natarajan": "/players/t-natarajan.jpg",
  "tabraiz-shamsi": "/players/tabraiz-shamsi.jpg",
  "tanay-thyagarajan": "/players/tanay-thyagarajan.jpg",
  "tanush-kotian": "/players/tanush-kotian.jpg",
  "tanveer-sangha": "/players/tanveer-sangha.jpg",
  "tanzim-hasan-sakib": "/players/tanzim-hasan-sakib.jpg",
  "taskin-ahmed": "/players/taskin-ahmed.jpg",
  "tejas-baroka": "/players/tejas-baroka.jpg",
  "tejasvi-dahiya": "/players/tejasvi-dahiya.png",
  "temba-bavuma": "/players/temba-bavuma.jpg",
  "tilak-varma": "/players/tilak-varma.jpg",
  "tim-david": "/players/tim-david.png",
  "tim-seifert": "/players/tim-seifert.jpg",
  "tim-southee": "/players/tim-southee.jpg",
  "todd-murphy": "/players/todd-murphy.jpg",
  "tom-banton": "/players/tom-banton.png",
  "tom-curran": "/players/tom-curran.jpg",
  "tom-kohler-cadmore": "/players/tom-kohler-cadmore.jpg",
  "tom-latham": "/players/tom-latham.jpg",
  "tony-de-zorzi": "/players/tony-de-zorzi.jpg",
  "towhid-hridoy": "/players/towhid-hridoy.jpg",
  "travis-head": "/players/travis-head.jpg",
  "trent-boult": "/players/trent-boult.jpg",
  "tripurana-vijay": "/players/tripurana-vijay.jpg",
  "tristan-stubbs": "/players/tristan-stubbs.jpg",
  "tushar-deshpande": "/players/tushar-deshpande.jpg",
  "tymal-mills": "/players/tymal-mills.jpg",
  "umesh-yadav": "/players/umesh-yadav.jpg",
  "umran-malik": "/players/umran-malik.jpg",
  "unmukt-chand": "/players/unmukt-chand.jpg",
  "upendra-yadav": "/players/upendra-yadav.png",
  "urvil-patel": "/players/urvil-patel.jpg",
  "utkarsh-singh": "/players/utkarsh-singh.jpg",
  "vaibhav-arora": "/players/vaibhav-arora.png",
  "vaibhav-suryavanshi": "/players/vaibhav-suryavanshi.jpg",
  "vansh-bedi": "/players/vansh-bedi.jpg",
  "varun-aaron": "/players/varun-aaron.jpg",
  "varun-chakaravarthy": "/players/varun-chakaravarthy.png",
  "venkatesh-iyer": "/players/venkatesh-iyer.jpg",
  "vidwath-kaverappa": "/players/vidwath-kaverappa.jpg",
  "vignesh-puthur": "/players/vignesh-puthur.jpg",
  "vijay-shankar": "/players/vijay-shankar.jpg",
  "vijayakanth-viyaskanth": "/players/vijayakanth-viyaskanth.jpg",
  "vipraj-nigam": "/players/vipraj-nigam.png",
  "virat-kohli": "/players/virat-kohli.jpg",
  "virat-singh": "/players/virat-singh.jpg",
  "vishnu-vinod": "/players/vishnu-vinod.jpg",
  "vishwanath-pratap-singh": "/players/vishwanath-pratap-singh.jpg",
  "vivrant-sharma": "/players/vivrant-sharma.jpg",
  "vyshak-vijaykumar": "/players/vyshak-vijaykumar.jpg",
  "wanindu-hasaranga": "/players/wanindu-hasaranga.png",
  "washington-sundar": "/players/washington-sundar.jpg",
  "wayne-parnell": "/players/wayne-parnell.jpg",
  "wellington-masakadza": "/players/wellington-masakadza.jpg",
  "wes-agar": "/players/wes-agar.jpg",
  "wiaan-mulder": "/players/wiaan-mulder.jpg",
  "will-jacks": "/players/will-jacks.jpg",
  "will-o-rourke": "/players/will-o-rourke.jpg",
  "will-sutherland": "/players/will-sutherland.png",
  "wriddhiman-saha": "/players/wriddhiman-saha.jpg",
  "xavier-bartlett": "/players/xavier-bartlett.png",
  "yash-dayal": "/players/yash-dayal.jpg",
  "yash-dhull": "/players/yash-dhull.jpg",
  "yash-thakur": "/players/yash-thakur.jpg",
  "yashasvi-jaiswal": "/players/yashasvi-jaiswal.jpg",
  "yashovardhan-parantap": "/players/yashovardhan-parantap.jpg",
  "yudhvir-singh-charak": "/players/yudhvir-singh-charak.jpg",
  "yuvraj-chudasama": "/players/yuvraj-chudasama.jpg",
  "yuzvendra-chahal": "/players/yuzvendra-chahal.jpg",
  "zahir-khan": "/players/zahir-khan.jpg",
  "zak-crawley": "/players/zak-crawley.jpg",
  "zak-foulkes": "/players/zak-foulkes.jpg",
  "zeeshan-ansari": "/players/zeeshan-ansari.png",
  "m-s-dhoni": "/players/ms-dhoni.jpg",
  "k-l-rahul": "/players/kl-rahul.jpg",
  "surya-kumar-yadav": "/players/suryakumar-yadav.jpg",
  "r-ashwin": "/players/ravichandran-ashwin.jpg",
  "varun-chakravarthy": "/players/varun-chakaravarthy.png"
};

export function getPlayerPhotoUrl(name: string): string | null {
  if (!name) return null;
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return PLAYER_PHOTO_MAP[slug] || `/players/${slug}.jpg`;
}

// Fallback authentic jersey styling mapped by franchise
const FRANCHISE_JERSEY_THEME: Record<string, { primary: string; secondary: string; accent: string }> = {
  CSK: { primary: '#FACC15', secondary: '#1E40AF', accent: '#EAB308' },
  MI: { primary: '#0284C7', secondary: '#F59E0B', accent: '#0369A1' },
  RCB: { primary: '#DC2626', secondary: '#090D16', accent: '#EAB308' },
  KKR: { primary: '#581C87', secondary: '#F59E0B', accent: '#6B21A8' },
  SRH: { primary: '#EA580C', secondary: '#0F172A', accent: '#C2410C' },
  RR: { primary: '#EC4899', secondary: '#1E3A8A', accent: '#BE185D' },
  DC: { primary: '#2563EB', secondary: '#DC2626', accent: '#1D4ED8' },
  PBKS: { primary: '#EF4444', secondary: '#94A3B8', accent: '#B91C1C' },
  GT: { primary: '#0F172A', secondary: '#F59E0B', accent: '#1E293B' },
  LSG: { primary: '#06B6D4', secondary: '#F97316', accent: '#0891B2' },
};

export const PlayerHeadshot: React.FC<PlayerHeadshotProps> = ({
  player,
  teamCode,
  size = 'md',
  className = '',
  showBadge = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getPlayerPhotoUrl(player.name);

  // Effective franchise for jersey coloring: active team or previous franchise
  const effectiveTeam = (
    teamCode ||
    player.previousTeam ||
    'RCB'
  ).toUpperCase() as TeamCode;
  const theme = FRANCHISE_JERSEY_THEME[effectiveTeam] || FRANCHISE_JERSEY_THEME.RCB;

  const initials = player.name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const containerSizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 shadow-md ${containerSizeClass} ${className}`}
      style={{
        background: `radial-gradient(circle at 50% 30%, ${theme.primary}25, #0B1120 90%)`,
      }}
      title={`${player.name} (${player.role || 'Player'})`}
    >
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={player.name}
          className="h-full w-full object-cover object-top transition duration-200 hover:scale-105"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        /* Authentic Stylized Vector Headshot with Official Franchise Jersey */
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Stadium Light Beam */}
          <circle cx="50" cy="40" r="45" fill={theme.primary} fillOpacity="0.12" />

          {/* Shoulders & Jersey */}
          <path
            d="M14 96 C14 74 28 66 50 66 C72 66 86 74 86 96 Z"
            fill={theme.primary}
          />
          {/* Jersey Collar / Stripes */}
          <path
            d="M36 66 L50 82 L64 66 C58 70 42 70 36 66 Z"
            fill={theme.secondary}
          />
          {/* Jersey Center Trim / Accent */}
          <line
            x1="50"
            y1="82"
            x2="50"
            y2="98"
            stroke={theme.secondary}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Head & Neck */}
          <path
            d="M44 54 H56 V66 H44 Z"
            fill="#D4A373"
          />
          {/* Face Oval */}
          <ellipse
            cx="50"
            cy="42"
            rx="18"
            ry="21"
            fill="#E0B084"
          />

          {/* Athletic Cap / Helmet */}
          <path
            d="M32 38 C32 23 40 18 50 18 C60 18 68 23 68 38 C68 38 64 36 50 36 C36 36 32 38 32 38 Z"
            fill={theme.secondary}
          />
          {/* Helmet Visor */}
          <path
            d="M30 38 C35 34 65 34 70 38 L72 41 C64 42 36 42 28 41 Z"
            fill={theme.primary}
          />

          {/* Player Initials Crest inside Jersey */}
          <text
            x="50"
            y="94"
            textAnchor="middle"
            fill={theme.secondary === '#F59E0B' ? '#000000' : '#FFFFFF'}
            fontSize="10"
            fontWeight="900"
            letterSpacing="0.5"
          >
            {initials}
          </text>
        </svg>
      )}

      {/* Optional OVR Badge */}
      {showBadge && player.overallRating && (
        <span className="absolute bottom-0 right-0 rounded-tl-md bg-amber-400 px-1 py-0.2 text-[9px] font-black text-stadium-950 shadow">
          {player.overallRating}
        </span>
      )}
    </div>
  );
};
