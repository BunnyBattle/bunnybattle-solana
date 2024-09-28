use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey;
pub mod zkeys;
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};
use zkeys::{CREATE_VERIFYING_KEY, MOVE_VERIFYING_KEY};

use ark_bn254;
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize, Compress, Validate};

use std::ops::Neg;
type G1 = ark_bn254::g1::G1Affine;

const NR_PUBLIC_INPUTS: usize = 1; // Adjust this number as per your requirement

declare_id!("3ASQJJBDUxpgDdGmdDFgwFUnwkuJ2nxBtjfQG3EQgHq2");

#[program]
pub mod bunnybattle_solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn verify_proof(ctx: Context<Verify>, instruction_data: Vec<u8>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);

        // Convert public inputs slice to array of arrays
        let mut public_inputs = [[0u8; 32]; NR_PUBLIC_INPUTS];
        public_inputs[0] = instruction_data[256..288].try_into().unwrap();

        // Proof_a preprocessing
        let proof_a = instruction_data[0..64].try_into().unwrap();
        let proof_b = instruction_data[64..192].try_into().unwrap();
        let proof_c = instruction_data[192..256].try_into().unwrap();

        // Initialize the verifier
        let mut verifier = Groth16Verifier::new(
            &proof_a,
            &proof_b,
            &proof_c,
            &public_inputs,
            &zkeys::CREATE_VERIFYING_KEY,
        )
        .map_err(|_| ProgramError::Custom(0))?; // Use a custom error code

        // Perform the verification
        let result = verifier.verify();

        match result {
            Ok(true) => msg!("Verification succeeded"),
            Ok(false) => msg!("Verification failed"),
            Err(e) => msg!("Verification error: {:?}", e),
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

// Context structure for the verification instruction
#[derive(Accounts)]
pub struct Verify<'info> {
    // Anchor provides Program, Signer, and Account traits, making account management easier
    pub authority: Signer<'info>,
}

// #[cfg(test)]
// mod tests {
//     use super::*;
//     use anchor_lang::prelude::*;
//     use Pub

//     pub const PROOF: [u8; 256] = [
//         12, 69, 221, 178, 220, 208, 17, 7, 234, 16, 51, 42, 50, 106, 219, 202, 78, 222, 119, 169,
//         184, 211, 76, 131, 71, 57, 32, 171, 185, 117, 128, 16, 57, 21, 36, 112, 85, 59, 210, 62,
//         247, 220, 209, 19, 143, 247, 78, 219, 32, 24, 110, 50, 216, 217, 187, 60, 168, 79, 131,
//         178, 173, 42, 188, 0, 25, 120, 46, 12, 233, 167, 180, 171, 145, 195, 225, 117, 135, 14,
//         180, 12, 140, 147, 2, 177, 137, 216, 241, 194, 23, 22, 61, 40, 28, 89, 230, 52, 25, 166,
//         27, 205, 124, 163, 48, 98, 183, 127, 29, 181, 94, 14, 38, 62, 19, 187, 151, 60, 130, 14,
//         154, 120, 71, 160, 49, 154, 34, 93, 156, 154, 7, 232, 14, 4, 178, 212, 38, 159, 87, 240, 3,
//         186, 93, 8, 66, 138, 173, 169, 181, 153, 1, 193, 92, 226, 141, 99, 141, 28, 41, 157, 66,
//         46, 45, 51, 55, 253, 230, 173, 224, 134, 91, 167, 50, 116, 115, 239, 241, 103, 242, 52,
//         169, 28, 148, 247, 27, 130, 63, 238, 180, 195, 46, 57, 211, 248, 48, 35, 8, 20, 104, 100,
//         83, 77, 95, 105, 9, 233, 82, 245, 216, 125, 126, 127, 220, 152, 182, 53, 9, 178, 58, 100,
//         117, 162, 132, 132, 15, 181, 1, 16, 88, 217, 88, 119, 90, 130, 202, 73, 55, 198, 207, 73,
//         113, 38, 158, 182, 118, 210, 97, 57, 149, 122, 179, 153, 7, 40, 189, 105, 54, 232,
//     ];

//     pub const PUBLIC_INPUTS: [[u8; 32]; 1] = [[
//         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//         0, 12,
//     ]];

//     #[tokio::test]
//     async fn test_verify_instruction() {
//         // Setting up the environment
//         let program_id = Pubkey::new_unique();
//         let authority = Pubkey::new_unique();

//         // Mock client and program setup
//         let (mut banks_client, payer, recent_blockhash) =
//             anchor_lang::solana_program_test::ProgramTest::new(
//                 "groth16_verifier",
//                 program_id,
//                 None,
//             )
//             .start()
//             .await;

//         // Prepare the instruction data
//         let mut instruction_data = Vec::new();
//         instruction_data.extend_from_slice(&PROOF);
//         for input in PUBLIC_INPUTS.iter() {
//             instruction_data.extend_from_slice(input);
//         }

//         // Construct the transaction
//         let verify_instruction = Instruction {
//             program_id: program_id,
//             accounts: vec![AccountMeta::new(payer.pubkey(), true)],
//             data: instruction_data,
//         };

//         let mut transaction =
//             Transaction::new_with_payer(&[verify_instruction], Some(&payer.pubkey()));
//         transaction.sign(&[&payer], recent_blockhash);

//         // Process the transaction and check the result
//         let result = banks_client.process_transaction(transaction).await;

//         assert!(result.is_ok());
//     }
// }
