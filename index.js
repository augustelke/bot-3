const {
Client,
GatewayIntentBits,
Partials,
SlashCommandBuilder,
Routes,
REST,
PermissionFlagsBits,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
EmbedBuilder,
ModalBuilder,
TextInputBuilder,
TextInputStyle,
InteractionType
} = require("discord.js");

const fs = require("fs");

const TOKEN = "TON_TOKEN";
const CLIENT_ID = "TON_CLIENT_ID";

const REVIEW_CHANNEL = "1502721949376188478";

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.DirectMessages
],
partials: [Partials.Channel]
});

if (!fs.existsSync("./database.json")) {
fs.writeFileSync(
"./database.json",
JSON.stringify(
{
reports: [],
tournaments: [],
applications: []
},
null,
2
)
);
}

function db() {
return JSON.parse(fs.readFileSync("./database.json"));
}

function save(data) {
fs.writeFileSync("./database.json", JSON.stringify(data, null, 2));
}

const commands = [

new SlashCommandBuilder()
.setName("tournoi")
.setDescription("Créer un tournoi")
.addStringOption(option =>
option
.setName("nom")
.setDescription("Nom")
.setRequired(true)
)
.addStringOption(option =>
option
.setName("horaire")
.setDescription("Horaire")
.setRequired(true)
)
.addStringOption(option =>
option
.setName("description")
.setDescription("Description")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("signal")
.setDescription("Faire un signalement")
.addUserOption(option =>
option
.setName("membre")
.setDescription("Membre")
.setRequired(true)
)
.addStringOption(option =>
option
.setName("raison")
.setDescription("Raison")
.setRequired(true)
)
.addBooleanOption(option =>
option
.setName("public")
.setDescription("Visible par les autres")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("supsignal")
.setDescription("Voir ou supprimer ses signalements"),

new SlashCommandBuilder()
.setName("voirsignal")
.setDescription("Voir les statistiques")
]

.map(c => c.toJSON());

client.once("ready", async () => {

console.log(`${client.user.tag} connecté`);

const rest = new REST({ version: "10" }).setToken(TOKEN);

await rest.put(
Routes.applicationCommands(CLIENT_ID),
{
body: commands
}
);

console.log("Commandes enregistrées");
});

client.on("interactionCreate", async interaction => {

if (interaction.isChatInputCommand()) {

if (
interaction.commandName === "tournoi"
) {

if (
!interaction.member.permissions.has(
PermissionFlagsBits.ManageMessages
)
) {
return interaction.reply({
content:
"❌ Réservé aux modérateurs",
ephemeral: true
});
}

const nom =
interaction.options.getString("nom");

const horaire =
interaction.options.getString(
"horaire"
);

const description =
interaction.options.getString(
"description"
);

const tournoiId = Date.now();

const data = db();

data.tournaments.push({
id: tournoiId,
nom,
horaire,
description,
participants: []
});

save(data);

const embed = new EmbedBuilder()
.setTitle(`🏆 ${nom}`)
.setDescription(description)
.addFields({
name: "⏰ Horaire",
value: horaire
});

const row =
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(
`join_${tournoiId}`
)
.setLabel("Participer")
.setStyle(ButtonStyle.Success)
);

await interaction.reply({
embeds: [embed],
components: [row]
});
}

if (
interaction.commandName === "signal"
) {

const membre =
interaction.options.getUser(
"membre"
);

const raison =
interaction.options.getString(
"raison"
);

const isPublic =
interaction.options.getBoolean(
"public"
);

const data = db();

data.reports.push({
id: Date.now(),
author:
interaction.user.id,
target: membre.id,
reason: raison,
public: isPublic,
date: new Date().toISOString()
});

save(data);

await interaction.reply({
content:
"✅ Signalement enregistré",
ephemeral: true
});
}

if (
interaction.commandName ===
"supsignal"
) {

const data = db();

const reports =
data.reports.filter(
r =>
r.author ===
interaction.user.id
);

if (!reports.length) {
return interaction.reply({
content:
"Aucun signalement.",
ephemeral: true
});
}

let txt = "";

reports.forEach(r => {
txt += `ID: ${r.id}\n`;
txt += `Cible: <@${r.target}>\n`;
txt += `Raison: ${r.reason}\n\n`;
});

await interaction.reply({
content: txt,
ephemeral: true
});
}

if (
interaction.commandName ===
"voirsignal"
) {

if (
!interaction.member.permissions.has(
PermissionFlagsBits.ManageMessages
)
) {
return interaction.reply({
content:
"❌ Réservé aux modérateurs",
ephemeral: true
});
}

const data = db();

const stats = {};

for (const r of data.reports) {

if (!stats[r.target])
stats[r.target] = 0;

stats[r.target]++;
}

const classement =
Object.entries(stats)
.sort((a, b) => b[1] - a[1])
.slice(0, 10);

let msg = "📊 Classement\n\n";

for (const [id, count] of classement) {
msg += `<@${id}> : ${count} signalements\n`;
}

await interaction.reply({
content: msg,
ephemeral: true
});
}
}
});
client.on("interactionCreate", async interaction => {

// Bouton Participer
if (interaction.isButton()) {

if (interaction.customId.startsWith("join_")) {

const tournoiId =
interaction.customId.split("_")[1];

const modal = new ModalBuilder()
.setCustomId(`apply_${tournoiId}`)
.setTitle("Inscription Tournoi");

const age = new TextInputBuilder()
.setCustomId("age")
.setLabel("Quel âge as-tu ?")
.setStyle(TextInputStyle.Short)
.setRequired(true);

const plateforme =
new TextInputBuilder()
.setCustomId("plateforme")
.setLabel("Plateforme")
.setStyle(TextInputStyle.Short)
.setRequired(true);

const dispo =
new TextInputBuilder()
.setCustomId("dispo")
.setLabel("Disponibilités")
.setStyle(TextInputStyle.Paragraph)
.setRequired(true);

modal.addComponents(
new ActionRowBuilder().addComponents(age),
new ActionRowBuilder().addComponents(plateforme),
new ActionRowBuilder().addComponents(dispo)
);

return interaction.showModal(modal);
}

// Acceptation
if (
interaction.customId.startsWith(
"accept_"
)
) {

if (
!interaction.member.permissions.has(
PermissionFlagsBits.ManageMessages
)
) {
return interaction.reply({
content: "❌",
ephemeral: true
});
}

const userId =
interaction.customId.split("_")[1];

try {

const user =
await client.users.fetch(userId);

await user.send(
"✅ Votre candidature au tournoi a été acceptée."
);

await interaction.reply({
content:
"✅ Candidature acceptée",
ephemeral: true
});

} catch {

await interaction.reply({
content:
"Impossible d'envoyer le MP.",
ephemeral: true
});

}
}

// Refus
if (
interaction.customId.startsWith(
"deny_"
)
) {

if (
!interaction.member.permissions.has(
PermissionFlagsBits.ManageMessages
)
) {
return interaction.reply({
content: "❌",
ephemeral: true
});
}

const userId =
interaction.customId.split("_")[1];

try {

const user =
await client.users.fetch(userId);

await user.send(
"❌ Votre candidature au tournoi a été refusée."
);

await interaction.reply({
content:
"❌ Candidature refusée",
ephemeral: true
});

} catch {

await interaction.reply({
content:
"Impossible d'envoyer le MP.",
ephemeral: true
});

}
}
}

// Réception du formulaire
if (
interaction.type ===
InteractionType.ModalSubmit
) {

if (
interaction.customId.startsWith(
"apply_"
)
) {

const tournoiId =
interaction.customId.split("_")[1];

const age =
interaction.fields.getTextInputValue(
"age"
);

const plateforme =
interaction.fields.getTextInputValue(
"plateforme"
);

const dispo =
interaction.fields.getTextInputValue(
"dispo"
);

const data = db();

data.applications.push({
tournoiId,
userId: interaction.user.id,
age,
plateforme,
dispo
});

save(data);

const salon =
await client.channels.fetch(
REVIEW_CHANNEL
);

const embed = new EmbedBuilder()
.setTitle("Nouvelle candidature")
.addFields(
{
name: "Joueur",
value:
`${interaction.user.tag}`
},
{
name: "Âge",
value: age
},
{
name: "Plateforme",
value: plateforme
},
{
name: "Disponibilités",
value: dispo
}
)
.setTimestamp();

const row =
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(
`accept_${interaction.user.id}`
)
.setLabel("Accepter")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(
`deny_${interaction.user.id}`
)
.setLabel("Refuser")
.setStyle(ButtonStyle.Danger)
);

await salon.send({
embeds: [embed],
components: [row]
});

await interaction.reply({
content:
"✅ Votre candidature a été envoyée.",
ephemeral: true
});
}
}
});
client.login(TOKEN);
