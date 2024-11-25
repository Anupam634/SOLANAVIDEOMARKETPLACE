use anchor_lang::prelude::*;

declare_id!("4WpWUh3unfvEHRfmiRMDgRxcvMAaZ5hCn16KaVMDoy8x"); // Program ID

#[program]
pub mod video_marketplace {
    use super::*;

    pub fn mint_video(
        ctx: Context<MintVideo>,
        name: String,
        price_in_sol: f64, // Accept price in SOL
        description: String,
        uri: String,
    ) -> Result<()> {
        // Validate if the URI is not empty
        if uri.is_empty() {
            return Err(ErrorCode::InvalidUri.into());
        }

        let video = &mut ctx.accounts.video;

        // Convert price from SOL to lamports
        let price_in_lamports = sol_to_lamports(price_in_sol);

        // Set video metadata
        video.name = name;
        video.price = price_in_lamports;
        video.description = description;
        video.uri = uri;
        video.creator = *ctx.accounts.creator.key;

        Ok(())
    }

    pub fn pay_to_play(ctx: Context<PayToPlay>) -> Result<()> {
        let video = &mut ctx.accounts.video;
        let player = &mut ctx.accounts.player;
        let creator = &mut ctx.accounts.creator;

        // Check if the player has sufficient funds
        if player.lamports() < video.price {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        // Transfer payment from player to creator
        **player.lamports.borrow_mut() -= video.price;
        **creator.lamports.borrow_mut() += video.price;

        Ok(())
    }
}

// Utility function to convert SOL to lamports
pub fn sol_to_lamports(sol: f64) -> u64 {
    (sol * 1_000_000_000.0) as u64
}

#[derive(Accounts)]
pub struct MintVideo<'info> {
    #[account(init, payer = creator, space = 8 + 64 + 8 + 256 + 256)]
    pub video: Account<'info, Video>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>, // Explicitly include the system program
}

#[derive(Accounts)]
pub struct PayToPlay<'info> {
    #[account(mut)]
    pub video: Account<'info, Video>,
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    pub system_program: Program<'info, System>, // Include system_program here as well
}

#[account]
pub struct Video {
    pub name: String,
    pub price: u64,
    pub description: String,
    pub uri: String,
    pub creator: Pubkey,
}

// Custom error codes with messages
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds to pay for the video.")]
    InsufficientFunds,

    #[msg("The provided URI is invalid.")]
    InvalidUri,
}
