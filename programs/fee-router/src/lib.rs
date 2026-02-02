use anchor_lang::prelude::*;

declare_id!("4ppsxyu3yBvh97DKU98PFTDb77bmz5utvcAkWVXSTMoB");

#[program]
pub mod fee_router {
    use super::*;

    pub fn initialize_router(ctx: Context<InitializeRouter>, mint: Pubkey) -> Result<()> {
        require!(mint == ctx.accounts.mint.key(), FeeRouterError::MintMismatch);

        let router = &mut ctx.accounts.router;
        router.authority = ctx.accounts.authority.key();
        router.mint = mint;
        router.last_mint = [0u8; 64];
        router.last_claim = [0u8; 64];
        router.last_distribute = [0u8; 64];

        emit!(RouterInitialized { mint, authority: router.authority });
        Ok(())
    }

    pub fn set_proof(ctx: Context<SetProof>, kind: u8, sig: [u8; 64]) -> Result<()> {
        let router = &mut ctx.accounts.router;
        match kind {
            0 => router.last_mint = sig,
            1 => router.last_claim = sig,
            2 => router.last_distribute = sig,
            _ => return err!(FeeRouterError::InvalidProofKind),
        }
        emit!(ProofUpdated { mint: router.mint, kind });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRouter<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: mint is only used for PDA derivation and identity check
    pub mint: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = Router::space(),
        seeds = [b"router", mint.key().as_ref()],
        bump
    )]
    pub router: Account<'info, Router>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetProof<'info> {
    #[account(mut, has_one = authority)]
    pub router: Account<'info, Router>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Router {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub last_mint: [u8; 64],
    pub last_claim: [u8; 64],
    pub last_distribute: [u8; 64],
}

impl Router {
    pub fn space() -> usize {
        8 + 32 + 32 + (64 * 3)
    }
}

#[event]
pub struct RouterInitialized {
    pub mint: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct ProofUpdated {
    pub mint: Pubkey,
    pub kind: u8,
}

#[error_code]
pub enum FeeRouterError {
    #[msg("Mint does not match account")]
    MintMismatch,
    #[msg("Invalid proof kind")]
    InvalidProofKind,
}
