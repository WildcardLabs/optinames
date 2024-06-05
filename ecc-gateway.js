const Web3  = require('web3');
const ethers = require('ethers');
const web3 = new Web3(process.env.RPC);
const domainaddress = process.env.NFT;
const domainabi = [{"inputs":[{"internalType":"string","name":"subDomain","type":"string"}],"name":"resolve","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];
const contract = new web3.eth.Contract(domainabi, domainaddress);

exports.helloWorld = async (req, res) => {

res.set('Access-Control-Allow-Origin', '*');

if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
} 
  
else {

var inputdata = req.query.data;
var resolverdata = inputdata.slice(10);
const decoded = web3.eth.abi.decodeParameters(['bytes', 'bytes'], resolverdata);
const hexname = decoded[0];
const data = decoded[1];
var coinType;
var key;
const functionSelector = data.slice(0, 10);
const callDataWithoutSelector = '0x' + data.slice(10);
try {coinType = web3.eth.abi.decodeParameters(['bytes32', 'uint256'], callDataWithoutSelector)[1];} catch (error) {coinType = null;}
try {key = web3.eth.abi.decodeParameters(['bytes32', 'string'], callDataWithoutSelector)[1];} catch (error) {key = null;}
const name = (convertNameToDomain(hexname.slice(2))).domain;
const sub = (convertNameToDomain(hexname.slice(2))).leftLabel;

if (functionSelector == '0x3b3b57de' || (functionSelector == '0xf1cb7e06' && ((coinType == 60 ) || coinType > 2147483648)))
      {
         try {var address = await contract.methods.resolve(sub).call();} catch (error) {return res.status(200).send();}
         if (functionSelector == '0x3b3b57de') {var result = web3.eth.abi.encodeParameter('address', address);}
         if (functionSelector == '0xf1cb7e06') {var result = web3.eth.abi.encodeParameter('bytes', address);}
         signAndReturn(result);
      }

 // We are using the same description for all domains/subdomains for now
  else if (key == 'description')
      {
        const description = "ECC Domains are tradable and transferrable sub-domains wrapped as ERC721s & fully integrated with the Ethereum Name Service (ENS). ECC leverages CCIP Offchain Resolution to mint ENS Subdomains on L2 (Optimism) while making them accessible on L1.";
        const result = web3.eth.abi.encodeParameter('string', description);
        signAndReturn(result);
      }

  // We are using the same logo for now
  else if (key == 'avatar')
      {
        const avatar = "https://avatar-twitter-cv4s4om35q-uc.a.run.app/?user=optinames";
        const result = web3.eth.abi.encodeParameter('string', avatar);
        signAndReturn(result);
      }
  
  // URL for the main ecc.eth domain
  else if (name == 'ecc.eth' && key == 'url')
      {
        const url = "https://optinames.xyz";
        const result = web3.eth.abi.encodeParameter('string', url);
        signAndReturn(result);
      }
  
  // Twitter record for the main ecc.eth domain
  else if (name == 'ecc.eth' && key == 'com.twitter')
      {
        const twitter = "optinames";
        const result = web3.eth.abi.encodeParameter('string', twitter);
        signAndReturn(result);
      }

  else
      {
        res.status(200).send();
      }

function convertNameToDomain(hexName) {
    const punycode = require('punycode');

    let bytes = [];
    for(let i=0; i< hexName.length-1; i+=2){
        bytes.push(parseInt(hexName.substr(i, 2), 16));
    }

    let arrayBuffer = new Uint8Array(bytes).buffer;
    let dataView = new DataView(arrayBuffer);
    let domainLabels = [];
    let offset = 0;

    while (offset < dataView.byteLength) {
        let length = dataView.getUint8(offset++);

        if (length === 0) {
            // End of string.
            break;
        }

        let labelBytes = new Uint8Array(arrayBuffer, offset, length);
        let label = new TextDecoder().decode(labelBytes);

        // If label starts with 'xn--' it could be punycode, attempt decoding
        if (label.startsWith('xn--')) {
            try {
                label = punycode.toUnicode(label);
            } catch (e) {
                // Ignore punycode decoding errors, keep original label
            }
        }
        
        domainLabels.push(label);
        offset += length;
    }

    let domain = domainLabels.join('.');
    let domainLabelCount = domainLabels.length;

    return {
        domain: domain,
        leftLabel: domainLabels[0],
        numberOfLabels: domainLabelCount
    };
  }

function signAndReturn(result) {
    
    const privateKey = process.env.PRIV_KEY;
    const signer = new ethers.utils.SigningKey(privateKey);
    const validUntil = Math.floor(Date.now() / 1000) + 120;

    let messageHash = ethers.utils.solidityKeccak256(
          ['bytes', 'address', 'uint64', 'bytes32', 'bytes32'],
          [
            '0x1900',
            req.query.sender,
            validUntil,
            ethers.utils.keccak256(req.query.data || '0x'),
            ethers.utils.keccak256(result),
          ]
        );


   const sig = signer.signDigest(messageHash);
   const sigData = ethers.utils.hexConcat([sig.r, sig._vs]);
   const returndata = web3.eth.abi.encodeParameters(['bytes','uint64','bytes'], [result, validUntil, sigData]);

   res.status(200).send({"data":returndata});

  }

}
}
