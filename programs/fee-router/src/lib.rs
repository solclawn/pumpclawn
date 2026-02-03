use anchor_lang::prelude::*;

declare_id!("4ppsxyu3yBvh97DKU98PFTDb77bmz5utvcAkWVXSTMoB");

const MAX_RECIPIENTS: usize = 8;

#[program]
pub mod fee_router {
    use super::*;

    pub fn initialize_router(
        ctx: Context<InitializeRouter>,
        mint: Pubkey,
        recipients: Vec<Pubkey>,
        bps: Vec<u16>,
    ) -> Result<()> {
        require!(mint == ctx.accounts.mint.key(), FeeRouterError::MintMismatch);
        require!(recipients.len() == bps.len(), FeeRouterError::InvalidSplit);
        require!(!recipients.is_empty(), FeeRouterError::InvalidSplit);
        require!(recipients.len() <= MAX_RECIPIENTS, FeeRouterError::TooManyRecipients);

        let sum: u32 = bps.iter().map(|v| *v as u32).sum();
        require!(sum == 10_000, FeeRouterError::InvalidSplit);

        let router = &mut ctx.accounts.router;
        router.authority = ctx.accounts.authority.key();
        router.mint = mint;
        router.recipients = recipients;
        router.bps = bps;
        router.vault_bump = ctx.bumps.vault;
        router.last_mint = [0u8; 64];
        router.last_claim = [0u8; 64];
        router.last_distribute = [0u8; 64];

        emit!(RouterInitialized { mint, authority: router.authority });
        Ok(())
    }

    pub fn update_router(ctx: Context<UpdateRouter>, recipients: Vec<Pubkey>, bps: Vec<u16>) -> Result<()> {
        require!(recipients.len() == bps.len(), FeeRouterError::InvalidSplit);
        require!(!recipients.is_empty(), FeeRouterError::InvalidSplit);
        require!(recipients.len() <= MAX_RECIPIENTS, FeeRouterError::TooManyRecipients);

        let sum: u32 = bps.iter().map(|v| *v as u32).sum();
        require!(sum == 10_000, FeeRouterError::InvalidSplit);

        let router = &mut ctx.accounts.router;
        router.recipients = recipients;
        router.bps = bps;

        emit!(RouterUpdated { mint: router.mint, authority: router.authority });
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, FeeRouterError::InvalidAmount);
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.payer.key(),
            &ctx.accounts.vault.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        emit!(Deposited { mint: ctx.accounts.router.mint, amount });
        Ok(())
    }

    pub fn distribute(ctx: Context<Distribute>) -> Result<()> {
        let router = &ctx.accounts.router;
        let vault_info = &ctx.accounts.vault.to_account_info();
        let total = **vault_info.lamports.borrow();
        require!(total > 0, FeeRouterError::EmptyVault);

        let seeds: &[&[u8]] = &[
            b"vault",
            router.mint.as_ref(),
            &[router.vault_bump],
        ];

        for (i, recipient) in router.recipients.iter().enumerate() {
            let bps = router.bps[i] as u64;
            let amount = total.saturating_mul(bps) / 10_000;
            if amount == 0 {
                continue;
            }
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.vault.key(),
                recipient,
                amount,
            );
            anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &[
                    ctx.accounts.vault.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[seeds],
            )?;
        }

        emit!(Distributed { mint: router.mint, total });
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
    #[account(
        seeds = [b"vault", mint.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault holds lamports only
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRouter<'info> {
    #[account(mut, has_one = authority)]
    pub router: Account<'info, Router>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub router: Account<'info, Router>,
    #[account(
        mut,
        seeds = [b"vault", router.mint.as_ref()],
        bump = router.vault_bump
    )]
    /// CHECK: PDA vault holds lamports only
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Distribute<'info> {
    #[account(mut)]
    pub router: Account<'info, Router>,
    #[account(
        mut,
        seeds = [b"vault", router.mint.as_ref()],
        bump = router.vault_bump
    )]
    /// CHECK: PDA vault holds lamports only
    pub vault: UncheckedAccount<'info>,
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
    pub recipients: Vec<Pubkey>,
    pub bps: Vec<u16>,
    pub vault_bump: u8,
    pub last_mint: [u8; 64],
    pub last_claim: [u8; 64],
    pub last_distribute: [u8; 64],
}

impl Router {
    pub fn space() -> usize {
        8 +
        32 +
        32 +
        4 + (32 * MAX_RECIPIENTS) +
        4 + (2 * MAX_RECIPIENTS) +
        1 +
        (64 * 3)
    }
}

#[event]
pub struct RouterInitialized {
    pub mint: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct RouterUpdated {
    pub mint: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct Deposited {
    pub mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Distributed {
    pub mint: Pubkey,
    pub total: u64,
}

#[event]
pub struct ProofUpdated {
    pub mint: Pubkey,
    pub kind: u8,
}

#[error_code]
pub enum FeeRouterError {
    #[msg("Invalid split")]
    InvalidSplit,
    #[msg("Mint does not match account")]
    MintMismatch,
    #[msg("Too many recipients")]
    TooManyRecipients,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Empty vault")]
    EmptyVault,
    #[msg("Invalid proof kind")]
    InvalidProofKind,
}
