import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BunnybattleSolana } from "../target/types/bunnybattle_solana";
import * as web3 from "@solana/web3.js";
import { expect } from "chai";
import * as snarkjs from "snarkjs";
import path from "path";
import {buildBn128, utils} from "ffjavascript";
const {unstringifyBigInts} = utils;

const player1Create = {
  "nonce": 12345,
  "ships": [
    [2, 2],
    [0, 0]
  ],
};


describe("bunnybattle-solana", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.BunnybattleSolana as Program<BunnybattleSolana>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("Basic proof check", async () => {
        const provider = anchor.AnchorProvider.env();
        anchor.setProvider(provider);
    
        const wallet = provider.wallet as anchor.Wallet;

        const proof1 = await genCreateProof(player1Create);

        // Send the proof data to the Solana program via Anchor
        try {
          const txSignature = await program.methods
            .verifyProof(Buffer.from(proof1))
            .accounts({
              authority: wallet.publicKey, // Wallet's public key as the signer
            })
            .signers([wallet.payer])
            .rpc();
    
          console.log("Transaction signature", txSignature);
        } catch (error) {
          console.error("Verification failed:", error);
          throw error;
        }
  })

  
});


// Utils (should be split out of test/)

const snarkjs = require('snarkjs')
const fs = require('fs')

const createWC = require('../circom/create/create_js/witness_calculator.js');
const createWasm = './circom/create/create_js/create.wasm'
const createZkey = './circom/create/create_0001.zkey'
const moveWC = require('../circom/makeamove/makeamove_js/witness_calculator.js');
const moveWasm = './circom/makeamove/makeamove_js/makeamove.wasm'
const moveZkey = './circom/makeamove/makeamove_0001.zkey'

const WITNESS_FILE = '/tmp/witness'

const genCreateProof = async (input: any) => {
  const buffer = fs.readFileSync(createWasm);
  const witnessCalculator = await createWC(buffer);
  const buff = await witnessCalculator.calculateWTNSBin(input);
  // The package methods read from files only, so we just shove it in /tmp/ and hope
  // there is no parallel execution.
  fs.writeFileSync(WITNESS_FILE, buff);
  const { proof, publicSignals } = await snarkjs.groth16.prove(createZkey, WITNESS_FILE);
  const solanaProof = await proofToSolanaInput(proof, publicSignals);
  return solanaProof
}


const genMoveProof = async (input: any) => {
  const buffer = fs.readFileSync(moveWasm);
  const witnessCalculator = await moveWC(buffer);
  const buff = await witnessCalculator.calculateWTNSBin(input);
  fs.writeFileSync(WITNESS_FILE, buff);
  const { proof, publicSignals } = await snarkjs.groth16.prove(moveZkey, WITNESS_FILE);
  const solanaProof = await proofToSolanaInput(proof, publicSignals);
  return solanaProof
}

// Instead of passing in a large array of numbers (annoying), we
// just make proof a single string (which will be decompiled as a uint32
// in the contract)
// Copied from Tornado's websnark fork:
// https://github.com/tornadocash/websnark/blob/master/src/utils.js
const proofToSolanaInput = async (proof: any, publicSignals: any) => {
  let curve = await buildBn128();
  let proofProc = unstringifyBigInts(proof);

  let pi_a = g1Uncompressed(curve, proofProc.pi_a);
  pi_a = reverseEndianness(pi_a)
  pi_a = await negateAndSerializeG1(curve, pi_a);
  let pi_a_0_u8_array = Array.from(pi_a);
  // console.log(pi_a_0_u8_array);

  const pi_b = g2Uncompressed(curve, proofProc.pi_b);
  let pi_b_0_u8_array = Array.from(pi_b);
  console.log(pi_b_0_u8_array.slice(0, 64));
  console.log(pi_b_0_u8_array.slice(64, 128));

  const pi_c = g1Uncompressed(curve, proofProc.pi_c);
  let pi_c_0_u8_array = Array.from(pi_c);
  console.log(pi_c_0_u8_array);
  // Assuming publicSignals has only one element
  const publicSignalsBuffer = to32ByteBuffer(BigInt(publicSignals[0]));
  let public_signal_0_u8_array = Array.from(publicSignalsBuffer);
  console.log(public_signal_0_u8_array);
  
  const serializedData = Buffer.concat([
        pi_a,
        pi_b,
        pi_c,
        publicSignalsBuffer
      ]);

  return serializedData;
}

// const toHex32 = (num: BigInt) => {
//   let str = num.toString(16);
//   while (str.length < 64) str = "0" + str;
//   return str;
// }


function to32ByteBuffer(bigInt) {
  const hexString = bigInt.toString(16).padStart(64, '0'); // Pad to 64 hex characters (32 bytes)
  const buffer = Buffer.from(hexString, "hex");
  return buffer; 
}

function g1Uncompressed(curve, p1Raw) {
  let p1 = curve.G1.fromObject(p1Raw);

  let buff = new Uint8Array(64); // 64 bytes for G1 uncompressed
  curve.G1.toRprUncompressed(buff, 0, p1);

  return Buffer.from(buff);
}

// Function to negate G1 element
function negateG1(curve, buffer) {
  let p1 = curve.G1.fromRprUncompressed(buffer, 0);
  let negatedP1 = curve.G1.neg(p1);
  let negatedBuffer = new Uint8Array(64);
  curve.G1.toRprUncompressed(negatedBuffer, 0, negatedP1);
  return Buffer.from(negatedBuffer);
}

// Function to reverse endianness of a buffer
function reverseEndianness(buffer) {
  return Buffer.from(buffer.reverse());
}

async function negateAndSerializeG1(curve, reversedP1Uncompressed) {
  if (!reversedP1Uncompressed || !(reversedP1Uncompressed instanceof Uint8Array || Buffer.isBuffer(reversedP1Uncompressed))) {
    console.error('Invalid input to negateAndSerializeG1:', reversedP1Uncompressed);
    throw new Error('Invalid input to negateAndSerializeG1');
  }
  // Negate the G1 point
  let p1 = curve.G1.toAffine(curve.G1.fromRprUncompressed(reversedP1Uncompressed, 0));
  let negatedP1 = curve.G1.neg(p1);

  // Serialize the negated point
  // The serialization method depends on your specific library
  let serializedNegatedP1 = new Uint8Array(64); // 32 bytes for x and 32 bytes for y
  curve.G1.toRprUncompressed(serializedNegatedP1, 0, negatedP1);
  // curve.G1.toRprUncompressed(serializedNegatedP1, 32, negatedP1.y);
  console.log(serializedNegatedP1)

  // Change endianness if necessary
  let proof_a = reverseEndianness(serializedNegatedP1);

  return proof_a;
}

function g2Uncompressed(curve, p2Raw) {
  let p2 = curve.G2.fromObject(p2Raw);

  let buff = new Uint8Array(128); // 128 bytes for G2 uncompressed
  curve.G2.toRprUncompressed(buff, 0, p2);

  return Buffer.from(buff);
}