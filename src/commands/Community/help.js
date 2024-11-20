const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Рассказывает что я умею"),
    async execute(interaction) {
        await interaction.deferReply();

        const helpEmbed = {
            color: 0xFFFFFF,
            title: 'Хэй, давай расскажу что умею!',
            description: 'Я Крыска <3 - Я умею играть на электронной балалайке)\nСписок моих комманд:',
            fields: [
                { name: '/help', value: 'Помощь' },
                { name: '/play', value: 'Начну играть музыку' },
                { name: '/stop', value: 'Перестану играть музыку' },
                { name: '/skip', value: 'Если песня не нравится, то пропущу её' },
                { name: '/loop', value: 'Буду играть одно и то же (песню или даже всю очередь)' },
                { name: '/empty', value: 'Освобожу очередь для новых треков' },
                { name: '/pauseresu', value: 'Остановлюсь и продолжу когда захочешь' },
                { name: '/queue', value: 'Покажу что в репертуаре (10 следующих треков)' },
                { name: '/shuffle', value: 'Буду играть песни в разнобой' },
                { name: '/volume', value: 'Буду играть громче или тише' },
            ]
        };

        await interaction.followUp({ embeds: [helpEmbed] });
    }
}
