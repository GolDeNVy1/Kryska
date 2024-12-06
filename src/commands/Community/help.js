const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Рассказывает что я умею"),
    async execute(interaction) {
        await interaction.deferReply();

        const helpEmbed = new EmbedBuilder()
            .setColor(0xFFFFFF)
            .setTitle('Хэй, давай расскажу что умею!')
            .setDescription('Я Крыска <3 - Я умею играть на электронной балалайке)\nСписок моих комманд:')
            .addFields(
                { name: '/help', value: 'Помощь' },
                { name: '/play', value: 'Начну играть музыку' },
                { name: '/stop', value: 'Перестану играть музыку' },
                { name: '/skip', value: 'Если песня не нравится, то пропущу её' },
                { name: '/loop', value: 'Буду играть одно и то же (песню или даже всю очередь)' },
                { name: '/empty', value: 'Освобожу очередь для новых треков' },
                { name: '/pauseresu', value: 'Остановлюсь и продолжу когда захочешь' },
                { name: '/queue', value: 'Покажу что в репертуаре (10 следующих треков)' },
                { name: '/shuffle', value: 'Буду играть песни в разнобой' },
                { name: '/volume', value: 'Буду играть громче или тише' }
            )
            .setFooter({
                text: `Захотел: ${interaction.user.displayName}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        await interaction.followUp({ embeds: [helpEmbed] });
    }
}
