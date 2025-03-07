import { MarkdownV2 } from './telegraf.utils';

describe('Telegraf', () => {
  it('should escape MarkdownV2', () => {
    const content = `═══ Execution Plan ═══
              ▰ Step 1: 💵 Balance Check
              Asset: \`ETH\`
              Balance Available: \`1.06\`
              ▰ Step 2: 🧮 Calculation
              Formula: 1.06 * 0.5
              Outcome: \`0.53\`
              ▰ Step 3: 🔁 Initiate Exchange
              Asset to Exchange: \`0.53\` \`ETH\`
              Asset to Receive: \`923.33\` \`USDT\` (At Least)
              Rate: \`1733.342\`
              Slippage: \`3%\`
              🚀 Proceed?\`
`;

    expect(MarkdownV2(content)).toMatchInlineSnapshot(`
      "═══ Execution Plan ═══
                    ▰ Step 1: 💵 Balance Check
                    Asset: \`ETH\`
                    Balance Available: \`1\\.06\`
                    ▰ Step 2: 🧮 Calculation
                    Formula: 1\\.06 \\* 0\\.5
                    Outcome: \`0\\.53\`
                    ▰ Step 3: 🔁 Initiate Exchange
                    Asset to Exchange: \`0\\.53\` \`ETH\`
                    Asset to Receive: \`923\\.33\` \`USDT\` \\(At Least\\)
                    Rate: \`1733\\.342\`
                    Slippage: \`3%\`
                    🚀 Proceed?\`
      "
    `);
  });
});
